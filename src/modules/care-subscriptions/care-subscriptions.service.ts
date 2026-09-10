import {
  CarePackageStatus,
  CarePackageType,
  CareSubscriptionStatus,
  ConversationStatus,
  ConversationType,
  MessageType,
  SenderType,
  StaffRole,
} from '@/commons/enums/vndoctor.enum';
import { BadRequest, Conflict, ErrorCode, Forbidden, NotFound } from '@/commons/exceptions';
import { CarePackage } from '@/modules/care-packages/entities/care-package.entity';
import { HealthProfile } from '@/modules/health-profiles/entities/health-profile.entity';
import { StaffUser } from '@/modules/staff/entities/staff-user.entity';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, LessThan, Repository } from 'typeorm';
import {
  AssignAndActivateCareSubscriptionDto,
  CreateCareSubscriptionDto,
  QueryCareSubscriptionDto,
  UpdateCareTeamDto,
} from './dtos';
import { PatientCareSubscription } from './entities/care-subscription.entity';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';

/**
 * Service managing Patient Care Subscriptions, Care Team assignment, activation, and expiration.
 */
@Injectable()
export class CareSubscriptionsService {
  private readonly logger = new Logger(CareSubscriptionsService.name);

  constructor(
    @InjectRepository(PatientCareSubscription)
    private readonly subscriptionRepo: Repository<PatientCareSubscription>,
    @InjectRepository(CarePackage)
    private readonly carePackageRepo: Repository<CarePackage>,
    @InjectRepository(HealthProfile)
    private readonly healthProfileRepo: Repository<HealthProfile>,
    @InjectRepository(StaffUser)
    private readonly staffUserRepo: Repository<StaffUser>,
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Register a new care subscription in PENDING status.
   *
   * @param dto Registration input containing healthProfileId and carePackageId
   * @param accountId Optional App Account ID of the patient
   * @returns Created PatientCareSubscription
   */
  async create(
    dto: CreateCareSubscriptionDto,
    accountId?: string,
  ): Promise<PatientCareSubscription> {
    // 1. Validate Health Profile existence and ownership
    const healthProfile = await this.healthProfileRepo.findOne({
      where: { id: dto.healthProfileId },
    });
    if (!healthProfile) {
      throw new NotFound(ErrorCode.HEALTH_PROFILE_NOT_FOUND);
    }

    if (accountId && healthProfile.accountId !== accountId) {
      throw new Forbidden(ErrorCode.HEALTH_PROFILE_ACCESS_DENIED);
    }

    // 2. Validate Care Package existence and active status
    const carePackage = await this.carePackageRepo.findOne({
      where: { id: dto.carePackageId },
    });
    if (!carePackage) {
      throw new NotFound(ErrorCode.CARE_PACKAGE_NOT_FOUND);
    }

    if (carePackage.status !== CarePackageStatus.ACTIVE) {
      throw new BadRequest(ErrorCode.CARE_PACKAGE_INACTIVE);
    }

    // 3. Check for existing active subscription for the same profile and package
    const existingActive = await this.subscriptionRepo.findOne({
      where: {
        healthProfileId: dto.healthProfileId,
        carePackageId: dto.carePackageId,
        status: CareSubscriptionStatus.ACTIVE,
      },
    });
    if (existingActive) {
      throw new Conflict(ErrorCode.CARE_SUBSCRIPTION_ALREADY_ACTIVE);
    }

    // 4. Create subscription in PENDING status (dates and care team are null until assignment)
    const subscription = this.subscriptionRepo.create({
      healthProfileId: dto.healthProfileId,
      carePackageId: dto.carePackageId,
      status: CareSubscriptionStatus.PENDING,
      startedAt: null,
      expiresAt: null,
      assignedDoctorId: null,
      assignedNurseId: null,
      assignedExpertId: null,
    });

    return this.subscriptionRepo.save(subscription);
  }

  /**
   * Find care subscriptions with filters, search, and pagination.
   *
   * @param query Query filters
   * @param staffFacilityId Optional Facility ID of authenticated staff
   * @param accountId Optional Account ID of authenticated patient
   * @returns Paginated result list
   */
  async findAll(
    query: QueryCareSubscriptionDto,
    staffFacilityId?: string,
    accountId?: string,
  ): Promise<{ data: PatientCareSubscription[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const qb = this.subscriptionRepo
      .createQueryBuilder('sub')
      .leftJoinAndSelect('sub.carePackage', 'pkg')
      .leftJoinAndSelect('sub.healthProfile', 'profile')
      .leftJoinAndSelect('sub.assignedDoctor', 'doctor')
      .leftJoinAndSelect('sub.assignedNurse', 'nurse')
      .leftJoinAndSelect('sub.assignedExpert', 'expert');

    // Filter by facility (either from staff context or explicit query)
    const targetFacilityId = query.facilityId || staffFacilityId;
    if (targetFacilityId) {
      qb.andWhere('pkg.facilityId = :facilityId', { facilityId: targetFacilityId });
    }

    // Filter by patient account
    if (accountId) {
      qb.andWhere('profile.accountId = :accountId', { accountId });
    }

    if (query.status) {
      qb.andWhere('sub.status = :status', { status: query.status });
    }

    if (query.healthProfileId) {
      qb.andWhere('sub.healthProfileId = :healthProfileId', {
        healthProfileId: query.healthProfileId,
      });
    }

    if (query.doctorId) {
      qb.andWhere('sub.assignedDoctorId = :doctorId', { doctorId: query.doctorId });
    }

    if (query.nurseId) {
      qb.andWhere('sub.assignedNurseId = :nurseId', { nurseId: query.nurseId });
    }

    if (query.search) {
      qb.andWhere('(profile.fullName ILIKE :search OR pkg.name ILIKE :search)', {
        search: `%${query.search.trim()}%`,
      });
    }

    qb.orderBy('sub.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return { data, total, page, limit };
  }

  /**
   * Find a specific care subscription by ID.
   *
   * @param id Subscription UUID
   * @param staffFacilityId Optional staff facility for scope checking
   * @param accountId Optional patient account for ownership checking
   * @returns Found PatientCareSubscription
   */
  async findById(
    id: string,
    staffFacilityId?: string,
    accountId?: string,
  ): Promise<PatientCareSubscription> {
    const subscription = await this.subscriptionRepo.findOne({
      where: { id },
      relations: [
        'carePackage',
        'carePackage.facility',
        'healthProfile',
        'assignedDoctor',
        'assignedNurse',
        'assignedExpert',
      ],
    });

    if (!subscription) {
      throw new NotFound(ErrorCode.CARE_SUBSCRIPTION_NOT_FOUND);
    }

    if (
      staffFacilityId &&
      subscription.carePackage?.facilityId &&
      subscription.carePackage.facilityId !== staffFacilityId
    ) {
      throw new Forbidden(ErrorCode.FACILITY_ACCESS_DENIED);
    }

    if (
      accountId &&
      subscription.healthProfile?.accountId &&
      subscription.healthProfile.accountId !== accountId
    ) {
      throw new Forbidden(ErrorCode.HEALTH_PROFILE_ACCESS_DENIED);
    }

    return subscription;
  }

  /**
   * Assign Care Team, calculate validity dates, activate package, and initialize chat room.
   * Executed atomically inside a database transaction.
   *
   * @param id Subscription UUID
   * @param dto Assign and activate payload
   * @param staffFacilityId Facility ID of the authenticated staff
   * @returns Activated PatientCareSubscription
   */
  async assignAndActivate(
    id: string,
    dto: AssignAndActivateCareSubscriptionDto,
    staffFacilityId?: string,
  ): Promise<PatientCareSubscription> {
    return this.dataSource.transaction(async (manager) => {
      // 1. Fetch subscription with relations
      const subscription = await manager.findOne(PatientCareSubscription, {
        where: { id },
        relations: ['carePackage', 'healthProfile'],
      });

      if (!subscription) {
        throw new NotFound(ErrorCode.CARE_SUBSCRIPTION_NOT_FOUND);
      }

      if (subscription.status !== CareSubscriptionStatus.PENDING) {
        throw new BadRequest(ErrorCode.CARE_SUBSCRIPTION_INVALID_STATUS);
      }

      const carePackage = subscription.carePackage;
      if (!carePackage) {
        throw new NotFound(ErrorCode.CARE_PACKAGE_NOT_FOUND);
      }

      const facilityId = carePackage.facilityId;
      if (staffFacilityId && facilityId !== staffFacilityId) {
        throw new Forbidden(ErrorCode.FACILITY_ACCESS_DENIED);
      }

      // 2. Validate VIP package requirement
      if (carePackage.type === CarePackageType.VIP && !dto.assignedExpertId) {
        throw new BadRequest(ErrorCode.MISSING_REQUIRED_FIELD);
      }

      // 3. Validate Assigned Primary Doctor
      const doctor = await manager.findOne(StaffUser, {
        where: { id: dto.assignedDoctorId },
      });
      if (!doctor) {
        throw new NotFound(ErrorCode.STAFF_NOT_FOUND);
      }
      if (doctor.facilityId !== facilityId) {
        throw new BadRequest(ErrorCode.FACILITY_ACCESS_DENIED);
      }
      if (doctor.role !== StaffRole.DOCTOR && doctor.role !== StaffRole.ADMIN) {
        throw new BadRequest(ErrorCode.BAD_REQUEST);
      }
      if (!doctor.isActive) {
        throw new BadRequest(ErrorCode.STAFF_INACTIVE);
      }

      // 4. Validate Assigned Support Nurse
      const nurse = await manager.findOne(StaffUser, {
        where: { id: dto.assignedNurseId },
      });
      if (!nurse) {
        throw new NotFound(ErrorCode.STAFF_NOT_FOUND);
      }
      if (nurse.facilityId !== facilityId) {
        throw new BadRequest(ErrorCode.FACILITY_ACCESS_DENIED);
      }
      if (nurse.role !== StaffRole.NURSE && nurse.role !== StaffRole.STAFF) {
        throw new BadRequest(ErrorCode.BAD_REQUEST);
      }
      if (!nurse.isActive) {
        throw new BadRequest(ErrorCode.STAFF_INACTIVE);
      }

      // 5. Validate Assigned Expert (if provided)
      let expert: StaffUser | null = null;
      if (dto.assignedExpertId) {
        expert = await manager.findOne(StaffUser, {
          where: { id: dto.assignedExpertId },
        });
        if (!expert) {
          throw new NotFound(ErrorCode.STAFF_NOT_FOUND);
        }
        if (expert.facilityId !== facilityId) {
          throw new BadRequest(ErrorCode.FACILITY_ACCESS_DENIED);
        }
        if (expert.role !== StaffRole.DOCTOR && expert.role !== StaffRole.ADMIN) {
          throw new BadRequest(ErrorCode.BAD_REQUEST);
        }
        if (!expert.isActive) {
          throw new BadRequest(ErrorCode.STAFF_INACTIVE);
        }
      }

      // 6. Calculate validity period
      const now = new Date();
      const expiresAt = new Date(
        now.getTime() + carePackage.durationDays * 24 * 60 * 60 * 1000,
      );

      // 7. Update subscription fields
      subscription.assignedDoctorId = dto.assignedDoctorId;
      subscription.assignedNurseId = dto.assignedNurseId;
      subscription.assignedExpertId = dto.assignedExpertId ?? null;
      subscription.status = CareSubscriptionStatus.ACTIVE;
      subscription.startedAt = now;
      subscription.expiresAt = expiresAt;

      const savedSubscription = await manager.save(PatientCareSubscription, subscription);

      // 8. Initialize or find CARE_TEAM conversation room
      let conversation = await manager.findOne(Conversation, {
        where: {
          subscriptionId: savedSubscription.id,
          type: ConversationType.CARE_TEAM,
        },
      });

      const patientName = subscription.healthProfile?.fullName ?? 'Bệnh nhân';

      if (!conversation) {
        conversation = manager.create(Conversation, {
          facilityId,
          type: ConversationType.CARE_TEAM,
          status: ConversationStatus.ACTIVE,
          subscriptionId: savedSubscription.id,
          healthProfileId: savedSubscription.healthProfileId,
          title: `Nhóm Chăm Sóc - ${patientName}`,
        });
        conversation = await manager.save(Conversation, conversation);
      }

      // 9. Send initial SYSTEM welcome message in the conversation room
      let welcomeContent = `Chào mừng bạn đến với nhóm chăm sóc sức khỏe của gói "${carePackage.name}". Đội ngũ phụ trách: Bác sĩ chính: ${doctor.fullName}, Điều dưỡng: ${nurse.fullName}`;
      if (expert) {
        welcomeContent += `, Bác sĩ chuyên gia: ${expert.fullName}`;
      }
      welcomeContent += '. Hãy để lại tin nhắn hoặc triệu chứng khi cần hỗ trợ!';

      const systemMessage = manager.create(Message, {
        conversationId: conversation.id,
        senderType: SenderType.SYSTEM,
        messageType: MessageType.SYSTEM,
        content: welcomeContent,
        isPinned: true,
      });
      const savedMessage = await manager.save(Message, systemMessage);

      // Update conversation last message metadata
      conversation.lastMessageId = savedMessage.id;
      conversation.lastMessageAt = now;
      conversation.lastMessagePreview = welcomeContent.substring(0, 250);
      await manager.save(Conversation, conversation);

      return savedSubscription;
    });
  }

  /**
   * Update Care Team assignments for an active subscription.
   *
   * @param id Subscription UUID
   * @param dto New assignments
   * @param staffFacilityId Facility ID of authenticated staff
   * @returns Updated subscription
   */
  async updateCareTeam(
    id: string,
    dto: UpdateCareTeamDto,
    staffFacilityId?: string,
  ): Promise<PatientCareSubscription> {
    const subscription = await this.findById(id, staffFacilityId);

    if (
      subscription.status !== CareSubscriptionStatus.ACTIVE &&
      subscription.status !== CareSubscriptionStatus.PENDING
    ) {
      throw new BadRequest(ErrorCode.CARE_SUBSCRIPTION_INVALID_STATUS);
    }

    const facilityId = subscription.carePackage?.facilityId;

    // Validate and update Doctor
    if (dto.assignedDoctorId) {
      const doctor = await this.staffUserRepo.findOne({
        where: { id: dto.assignedDoctorId },
      });
      if (!doctor || doctor.facilityId !== facilityId || !doctor.isActive) {
        throw new BadRequest(ErrorCode.BAD_REQUEST);
      }
      subscription.assignedDoctorId = dto.assignedDoctorId;
    }

    // Validate and update Nurse
    if (dto.assignedNurseId) {
      const nurse = await this.staffUserRepo.findOne({
        where: { id: dto.assignedNurseId },
      });
      if (!nurse || nurse.facilityId !== facilityId || !nurse.isActive) {
        throw new BadRequest(ErrorCode.BAD_REQUEST);
      }
      subscription.assignedNurseId = dto.assignedNurseId;
    }

    // Validate and update Expert
    if (dto.assignedExpertId !== undefined) {
      if (dto.assignedExpertId) {
        const expert = await this.staffUserRepo.findOne({
          where: { id: dto.assignedExpertId },
        });
        if (!expert || expert.facilityId !== facilityId || !expert.isActive) {
          throw new BadRequest(ErrorCode.BAD_REQUEST);
        }
        subscription.assignedExpertId = dto.assignedExpertId;
      } else {
        if (subscription.carePackage?.type === CarePackageType.VIP) {
          throw new BadRequest(ErrorCode.MISSING_REQUIRED_FIELD);
        }
        subscription.assignedExpertId = null;
      }
    }

    return this.subscriptionRepo.save(subscription);
  }

  /**
   * Cancel a subscription.
   *
   * @param id Subscription UUID
   * @param staffFacilityId Facility ID of authenticated staff
   * @returns Cancelled subscription
   */
  async cancel(id: string, staffFacilityId?: string): Promise<PatientCareSubscription> {
    const subscription = await this.findById(id, staffFacilityId);

    if (subscription.status === CareSubscriptionStatus.CANCELLED) {
      throw new BadRequest(ErrorCode.CARE_SUBSCRIPTION_ALREADY_CANCELLED);
    }

    if (subscription.status === CareSubscriptionStatus.EXPIRED) {
      throw new BadRequest(ErrorCode.CARE_SUBSCRIPTION_ALREADY_EXPIRED);
    }

    subscription.status = CareSubscriptionStatus.CANCELLED;
    return this.subscriptionRepo.save(subscription);
  }

  /**
   * Scheduled job method to automatically mark expired subscriptions as EXPIRED.
   *
   * @returns Number of subscriptions marked as expired
   */
  async expireSubscriptionsJob(): Promise<number> {
    const now = new Date();
    const expiredList = await this.subscriptionRepo.find({
      where: {
        status: CareSubscriptionStatus.ACTIVE,
        expiresAt: LessThan(now),
      },
    });

    if (expiredList.length === 0) {
      return 0;
    }

    for (const sub of expiredList) {
      sub.status = CareSubscriptionStatus.EXPIRED;
    }

    await this.subscriptionRepo.save(expiredList);
    this.logger.log(`Auto-expired ${expiredList.length} care subscriptions.`);
    return expiredList.length;
  }
}
