import {
  CareRequestStatus,
  CareSubscriptionStatus,
  ConversationType,
  MessageType,
  SenderType,
  StaffRole,
} from '@/commons/enums/vndoctor.enum';
import { BadRequest, Forbidden, NotFound, ErrorCode } from '@/commons/exceptions';
import { PatientCareSubscription } from '@/modules/care-subscriptions/entities/care-subscription.entity';
import { Conversation } from '@/modules/care-subscriptions/entities/conversation.entity';
import { Message } from '@/modules/care-subscriptions/entities/message.entity';
import { Facility } from '@/modules/facilities/entities/facility.entity';
import { StaffUser } from '@/modules/staff/entities/staff-user.entity';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AssignCareRequestDto,
  CreateCareRequestDto,
  QueryCareRequestDto,
  ResolveCareRequestDto,
  UpdateCareRequestStatusDto,
} from './dtos';
import { PatientCareRequest } from './entities/care-request.entity';

/**
 * Service managing Patient Care Requests, Care Team assignment, escalation, and resolution.
 */
@Injectable()
export class CareRequestsService {
  private readonly logger = new Logger(CareRequestsService.name);

  constructor(
    @InjectRepository(PatientCareRequest)
    private readonly careRequestRepo: Repository<PatientCareRequest>,
    @InjectRepository(PatientCareSubscription)
    private readonly subscriptionRepo: Repository<PatientCareSubscription>,
    @InjectRepository(Facility)
    private readonly facilityRepo: Repository<Facility>,
    @InjectRepository(StaffUser)
    private readonly staffUserRepo: Repository<StaffUser>,
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
  ) {}

  /**
   * Helper to generate a unique care request code (e.g. REQ-20260908-A1B2).
   */
  private generateRequestCode(): string {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const randomHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `REQ-${dateStr}-${randomHex}`;
  }

  /**
   * Create a new Patient Care Request.
   *
   * @param dto Input containing subscriptionId, title, description, mediaUrls
   * @param accountId Optional App Account ID of patient
   * @returns Created PatientCareRequest
   */
  async create(
    dto: CreateCareRequestDto,
    accountId?: string,
  ): Promise<PatientCareRequest> {
    // 1. Validate subscription existence and active status
    const subscription = await this.subscriptionRepo.findOne({
      where: { id: dto.subscriptionId },
      relations: ['carePackage', 'healthProfile'],
    });

    if (!subscription) {
      throw new NotFound(ErrorCode.CARE_SUBSCRIPTION_NOT_FOUND);
    }

    if (accountId && subscription.healthProfile?.accountId !== accountId) {
      throw new Forbidden(ErrorCode.CARE_SUBSCRIPTION_NOT_FOUND);
    }

    if (subscription.status !== CareSubscriptionStatus.ACTIVE) {
      throw new BadRequest(ErrorCode.CARE_SUBSCRIPTION_EXPIRED);
    }

    const facilityId = subscription.carePackage?.facilityId;
    if (!facilityId) {
      throw new NotFound(ErrorCode.FACILITY_NOT_FOUND);
    }


    // 2. Determine initial assigned staff: Default to support nurse if assigned, else primary doctor
    const initialAssignedUserId =
      subscription.assignedNurseId || subscription.assignedDoctorId || null;

    // 3. Create care request record
    const requestCode = this.generateRequestCode();
    const careRequest = this.careRequestRepo.create({
      requestCode,
      facilityId,
      subscriptionId: subscription.id,
      assignedUserId: initialAssignedUserId,
      status: CareRequestStatus.PENDING,
      title: dto.title.trim(),
      description: dto.description?.trim() ?? null,
      mediaUrls: dto.mediaUrls ?? [],
    });

    const savedRequest = await this.careRequestRepo.save(careRequest);

    // 4. Sync care request as a message into the Care Team Conversation
    try {
      const conversation = await this.conversationRepo.findOne({
        where: {
          subscriptionId: subscription.id,
          type: ConversationType.CARE_TEAM,
        },
      });

      if (conversation) {
        const now = new Date();
        const previewContent = `[Yêu cầu hỗ trợ - ${requestCode}] ${dto.title.trim()}`;
        const chatMessage = this.messageRepo.create({
          conversationId: conversation.id,
          senderType: SenderType.PATIENT,
          messageType: MessageType.CARE_REQUEST,
          resourceId: savedRequest.id,
          content: previewContent,
          mediaUrl: dto.mediaUrls && dto.mediaUrls.length > 0 ? dto.mediaUrls[0] : null,
        });

        const savedMessage = await this.messageRepo.save(chatMessage);

        conversation.lastMessageId = savedMessage.id;
        conversation.lastMessageAt = now;
        conversation.lastMessagePreview = previewContent.substring(0, 250);
        await this.conversationRepo.save(conversation);
      }
    } catch (err) {
      this.logger.warn(`Failed to sync care request ${savedRequest.id} to chat: ${String(err)}`);
    }

    return savedRequest;
  }

  /**
   * Find care requests with pagination and filters.
   *
   * @param query Filter and pagination params
   * @param staffFacilityId Optional staff facility for isolation
   * @param accountId Optional patient account for isolation
   * @returns Paginated result list
   */
  async findAll(
    query: QueryCareRequestDto,
    staffFacilityId?: string,
    accountId?: string,
  ): Promise<{ data: PatientCareRequest[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const qb = this.careRequestRepo
      .createQueryBuilder('req')
      .leftJoinAndSelect('req.facility', 'facility')
      .leftJoinAndSelect('req.subscription', 'sub')
      .leftJoinAndSelect('sub.carePackage', 'pkg')
      .leftJoinAndSelect('sub.healthProfile', 'profile')
      .leftJoinAndSelect('req.assignedUser', 'assignedStaff');

    const targetFacilityId = query.facilityId || staffFacilityId;
    if (targetFacilityId) {
      qb.andWhere('req.facilityId = :facilityId', { facilityId: targetFacilityId });
    }

    if (accountId) {
      qb.andWhere('profile.accountId = :accountId', { accountId });
    }

    if (query.subscriptionId) {
      qb.andWhere('req.subscriptionId = :subscriptionId', {
        subscriptionId: query.subscriptionId,
      });
    }

    if (query.assignedUserId) {
      qb.andWhere('req.assignedUserId = :assignedUserId', {
        assignedUserId: query.assignedUserId,
      });
    }

    if (query.status) {
      qb.andWhere('req.status = :status', { status: query.status });
    }

    if (query.search) {
      qb.andWhere(
        '(req.requestCode ILIKE :search OR req.title ILIKE :search OR profile.fullName ILIKE :search)',
        { search: `%${query.search.trim()}%` },
      );
    }

    qb.orderBy('req.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return { data, total, page, limit };
  }

  /**
   * Find a specific care request by ID.
   *
   * @param id Care Request UUID
   * @param staffFacilityId Optional staff facility for access check
   * @param accountId Optional patient account for access check
   * @returns Found PatientCareRequest
   */
  async findById(
    id: string,
    staffFacilityId?: string,
    accountId?: string,
  ): Promise<PatientCareRequest> {
    const careRequest = await this.careRequestRepo.findOne({
      where: { id },
      relations: [
        'facility',
        'subscription',
        'subscription.carePackage',
        'subscription.healthProfile',
        'assignedUser',
      ],
    });

    if (!careRequest) {
      throw new NotFound(ErrorCode.CARE_REQUEST_NOT_FOUND);
    }

    if (staffFacilityId && careRequest.facilityId !== staffFacilityId) {
      throw new Forbidden(ErrorCode.FACILITY_ACCESS_DENIED);
    }

    if (
      accountId &&
      careRequest.subscription?.healthProfile?.accountId &&
      careRequest.subscription.healthProfile.accountId !== accountId
    ) {
      throw new Forbidden(ErrorCode.CARE_REQUEST_NOT_FOUND);
    }

    return careRequest;
  }

  /**
   * Assign, pick, or escalate a care request to another doctor/nurse.
   *
   * @param id Care Request UUID
   * @param dto Assign payload
   * @param staffFacilityId Facility ID of authenticated staff
   * @returns Updated PatientCareRequest
   */
  async assignStaff(
    id: string,
    dto: AssignCareRequestDto,
    staffFacilityId?: string,
  ): Promise<PatientCareRequest> {
    const careRequest = await this.findById(id, staffFacilityId);

    if (
      careRequest.status === CareRequestStatus.RESOLVED ||
      careRequest.status === CareRequestStatus.CANCELLED
    ) {
      throw new BadRequest(ErrorCode.CARE_REQUEST_ALREADY_RESOLVED);
    }

    // Validate target staff user
    const targetStaff = await this.staffUserRepo.findOne({
      where: { id: dto.assignedUserId },
    });

    if (!targetStaff) {
      throw new NotFound(ErrorCode.STAFF_NOT_FOUND);
    }

    if (targetStaff.facilityId !== careRequest.facilityId) {
      throw new BadRequest(ErrorCode.FACILITY_ACCESS_DENIED);
    }

    if (
      targetStaff.role !== StaffRole.DOCTOR &&
      targetStaff.role !== StaffRole.NURSE &&
      targetStaff.role !== StaffRole.ADMIN
    ) {
      throw new BadRequest(ErrorCode.INVALID_INPUT);
    }

    if (!targetStaff.isActive) {
      throw new BadRequest(ErrorCode.STAFF_INACTIVE);
    }

    careRequest.assignedUserId = dto.assignedUserId;
    if (careRequest.status === CareRequestStatus.PENDING) {
      careRequest.status = CareRequestStatus.IN_PROGRESS;
    }

    const savedRequest = await this.careRequestRepo.save(careRequest);

    // Sync notification into Care Team Chat
    try {
      const conversation = await this.conversationRepo.findOne({
        where: {
          subscriptionId: careRequest.subscriptionId,
          type: ConversationType.CARE_TEAM,
        },
      });

      if (conversation) {
        const now = new Date();
        const rolePrefix = targetStaff.role === StaffRole.DOCTOR ? 'BS.' : 'ĐD.';
        let escalationMsg = `[Tiếp nhận / Chuyển ca] Yêu cầu ${careRequest.requestCode} đã được chuyển cho ${rolePrefix} ${targetStaff.fullName} xử lý.`;
        if (dto.note) {
          escalationMsg += ` (Ghi chú: ${dto.note.trim()})`;
        }

        const chatMessage = this.messageRepo.create({
          conversationId: conversation.id,
          senderType: SenderType.STAFF,
          messageType: MessageType.SYSTEM,
          content: escalationMsg,
        });

        const savedMsg = await this.messageRepo.save(chatMessage);
        conversation.lastMessageId = savedMsg.id;
        conversation.lastMessageAt = now;
        conversation.lastMessagePreview = escalationMsg.substring(0, 250);
        await this.conversationRepo.save(conversation);
      }
    } catch (err) {
      this.logger.warn(`Failed to sync assignment message to chat: ${String(err)}`);
    }

    return savedRequest;
  }

  /**
   * Doctor or Nurse resolves the care request with medical conclusions and instructions.
   *
   * @param id Care Request UUID
   * @param dto Resolution payload
   * @param staffFacilityId Facility ID of authenticated staff
   * @param staffUserId ID of staff resolving the request
   * @returns Resolved PatientCareRequest
   */
  async resolve(
    id: string,
    dto: ResolveCareRequestDto,
    staffFacilityId?: string,
    staffUserId?: string,
  ): Promise<PatientCareRequest> {
    const careRequest = await this.findById(id, staffFacilityId);

    if (careRequest.status === CareRequestStatus.RESOLVED) {
      throw new BadRequest(ErrorCode.CARE_REQUEST_ALREADY_RESOLVED);
    }

    if (careRequest.status === CareRequestStatus.CANCELLED) {
      throw new BadRequest(ErrorCode.CARE_REQUEST_ALREADY_RESOLVED);
    }

    const now = new Date();
    careRequest.status = CareRequestStatus.RESOLVED;
    careRequest.resolutionNote = dto.resolutionNote.trim();
    careRequest.resolvedAt = now;

    if (!careRequest.assignedUserId && staffUserId) {
      careRequest.assignedUserId = staffUserId;
    }

    const savedRequest = await this.careRequestRepo.save(careRequest);

    // Sync medical resolution message into Care Team Chat
    try {
      const conversation = await this.conversationRepo.findOne({
        where: {
          subscriptionId: careRequest.subscriptionId,
          type: ConversationType.CARE_TEAM,
        },
      });

      if (conversation) {
        const resolutionMsg = `[Kết luận y tế - ${careRequest.requestCode}]: ${dto.resolutionNote.trim()}`;
        const chatMessage = this.messageRepo.create({
          conversationId: conversation.id,
          senderType: SenderType.STAFF,
          messageType: MessageType.SYSTEM,
          resourceId: savedRequest.id,
          content: resolutionMsg,
        });

        const savedMsg = await this.messageRepo.save(chatMessage);
        conversation.lastMessageId = savedMsg.id;
        conversation.lastMessageAt = now;
        conversation.lastMessagePreview = resolutionMsg.substring(0, 250);
        await this.conversationRepo.save(conversation);
      }
    } catch (err) {
      this.logger.warn(`Failed to sync resolution message to chat: ${String(err)}`);
    }

    return savedRequest;
  }

  /**
   * Update operational status of a care request (e.g. IN_PROGRESS or CANCELLED).
   *
   * @param id Care Request UUID
   * @param dto Update status payload
   * @param staffFacilityId Facility ID of authenticated staff
   * @returns Updated PatientCareRequest
   */
  async updateStatus(
    id: string,
    dto: UpdateCareRequestStatusDto,
    staffFacilityId?: string,
  ): Promise<PatientCareRequest> {
    const careRequest = await this.findById(id, staffFacilityId);

    if (careRequest.status === CareRequestStatus.RESOLVED) {
      throw new BadRequest(ErrorCode.CARE_REQUEST_ALREADY_RESOLVED);
    }

    careRequest.status = dto.status;
    return this.careRequestRepo.save(careRequest);
  }
}

