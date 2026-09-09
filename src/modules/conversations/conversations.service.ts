import {
  ConversationStatus,
  ConversationType,
  MessageType,
  SenderType,
} from '@/commons/enums/vndoctor.enum';
import { BadRequest, Forbidden, NotFound } from '@/commons/exceptions';
import { Account } from '@/modules/accounts/entities/account.entity';
import { PatientCareSubscription } from '@/modules/care-subscriptions/entities/care-subscription.entity';
import { Conversation } from '@/modules/care-subscriptions/entities/conversation.entity';
import { Message } from '@/modules/care-subscriptions/entities/message.entity';
import { HealthProfile } from '@/modules/health-profiles/entities/health-profile.entity';
import { StaffUser } from '@/modules/staff/entities/staff-user.entity';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CreateDirectConversationDto,
  QueryConversationDto,
  QueryMessageDto,
  SendMessageDto,
} from './dtos';

/**
 * Service managing Conversations, Messages, and Realtime communication.
 */
@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(HealthProfile)
    private readonly healthProfileRepo: Repository<HealthProfile>,
    @InjectRepository(StaffUser)
    private readonly staffUserRepo: Repository<StaffUser>,
    @InjectRepository(Account)
    private readonly accountRepo: Repository<Account>,
    @InjectRepository(PatientCareSubscription)
    private readonly subscriptionRepo: Repository<PatientCareSubscription>,
  ) {}

  /**
   * Create or retrieve an existing direct 1-1 conversation between Doctor and Patient.
   *
   * @param dto Target patient profile and doctor user
   * @param callerStaffId Optional staff caller ID
   * @param callerAccountId Optional patient caller ID
   * @returns Found or created direct Conversation
   */
  async createDirectConversation(
    dto: CreateDirectConversationDto,
    callerStaffId?: string,
    callerAccountId?: string,
  ): Promise<Conversation> {
    // 1. Validate Health Profile
    const profile = await this.healthProfileRepo.findOne({
      where: { id: dto.healthProfileId },
    });
    if (!profile) {
      throw new NotFound(`Hồ sơ sức khỏe ${dto.healthProfileId} không tồn tại`);
    }

    if (callerAccountId && profile.accountId !== callerAccountId) {
      throw new Forbidden('Bạn không có quyền mở hội thoại cho hồ sơ sức khỏe này');
    }

    // 2. Validate Target Doctor / Staff
    const doctor = await this.staffUserRepo.findOne({
      where: { id: dto.directUserId },
    });
    if (!doctor) {
      throw new NotFound(`Bác sĩ/Nhân viên y tế ${dto.directUserId} không tồn tại`);
    }

    if (!doctor.isActive) {
      throw new BadRequest(`Tài khoản của ${doctor.fullName} hiện đang bị vô hiệu hóa`);
    }

    // 3. Check for existing direct conversation
    const existing = await this.conversationRepo.findOne({
      where: {
        type: ConversationType.DIRECT,
        healthProfileId: dto.healthProfileId,
        directUserId: dto.directUserId,
      },
      relations: ['facility', 'healthProfile', 'directUser'],
    });

    if (existing) {
      return existing;
    }

    // 4. Create new direct conversation
    const conversation = this.conversationRepo.create({
      facilityId: doctor.facilityId,
      type: ConversationType.DIRECT,
      status: ConversationStatus.ACTIVE,
      healthProfileId: dto.healthProfileId,
      directUserId: dto.directUserId,
      title: `Tư vấn: ${profile.fullName} - ${doctor.fullName}`,
    });

    return this.conversationRepo.save(conversation);
  }

  /**
   * Find conversations for authenticated user with filters and pagination.
   *
   * @param query Query filters
   * @param staffFacilityId Staff facility for isolation
   * @param staffUserId Staff user ID
   * @param accountId Patient account ID
   * @returns Paginated conversations
   */
  async findAll(
    query: QueryConversationDto,
    staffFacilityId?: string,
    staffUserId?: string,
    accountId?: string,
  ): Promise<{ data: Conversation[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const qb = this.conversationRepo
      .createQueryBuilder('conv')
      .leftJoinAndSelect('conv.facility', 'facility')
      .leftJoinAndSelect('conv.healthProfile', 'profile')
      .leftJoinAndSelect('conv.directUser', 'directUser')
      .leftJoinAndSelect('conv.subscription', 'sub')
      .leftJoinAndSelect('sub.carePackage', 'pkg')
      .leftJoinAndSelect('sub.healthProfile', 'subProfile');

    if (staffFacilityId) {
      qb.andWhere('conv.facilityId = :facilityId', { facilityId: staffFacilityId });
    }

    if (accountId) {
      qb.andWhere('(profile.accountId = :accountId OR subProfile.accountId = :accountId)', {
        accountId,
      });
    }

    if (query.type) {
      qb.andWhere('conv.type = :type', { type: query.type });
    }

    if (query.status) {
      qb.andWhere('conv.status = :status', { status: query.status });
    }

    if (query.facilityId) {
      qb.andWhere('conv.facilityId = :targetFacilityId', {
        targetFacilityId: query.facilityId,
      });
    }

    if (query.search) {
      qb.andWhere(
        '(conv.title ILIKE :search OR profile.fullName ILIKE :search OR subProfile.fullName ILIKE :search)',
        { search: `%${query.search.trim()}%` },
      );
    }

    qb.orderBy('conv.lastMessageAt', 'DESC', 'NULLS LAST')
      .addOrderBy('conv.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return { data, total, page, limit };
  }

  /**
   * Find a conversation by ID with access validation.
   *
   * @param id Conversation UUID
   * @param staffFacilityId Optional staff facility
   * @param accountId Optional patient account ID
   * @returns Found Conversation
   */
  async findById(
    id: string,
    staffFacilityId?: string,
    accountId?: string,
  ): Promise<Conversation> {
    const conversation = await this.conversationRepo.findOne({
      where: { id },
      relations: [
        'facility',
        'healthProfile',
        'directUser',
        'subscription',
        'subscription.carePackage',
        'subscription.healthProfile',
        'subscription.assignedDoctor',
        'subscription.assignedNurse',
        'subscription.assignedExpert',
      ],
    });

    if (!conversation) {
      throw new NotFound(`Không tìm thấy phòng chat với ID ${id}`);
    }

    if (staffFacilityId && conversation.facilityId !== staffFacilityId) {
      throw new Forbidden('Bạn không có quyền truy cập phòng chat của cơ sở y tế khác');
    }

    if (accountId) {
      const isOwner =
        conversation.healthProfile?.accountId === accountId ||
        conversation.subscription?.healthProfile?.accountId === accountId;

      if (!isOwner) {
        throw new Forbidden('Bạn không có quyền truy cập phòng chat này');
      }
    }

    return conversation;
  }

  /**
   * Get messages inside a conversation with cursor / pagination.
   *
   * @param conversationId Conversation UUID
   * @param query Pagination params
   * @param staffFacilityId Staff facility
   * @param accountId Patient account ID
   * @returns List of messages
   */
  async getMessages(
    conversationId: string,
    query: QueryMessageDto,
    staffFacilityId?: string,
    accountId?: string,
  ): Promise<{ data: Message[]; total: number; page: number; limit: number }> {
    // Validate conversation access
    await this.findById(conversationId, staffFacilityId, accountId);

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 30));
    const skip = (page - 1) * limit;

    const qb = this.messageRepo
      .createQueryBuilder('msg')
      .leftJoinAndSelect('msg.senderUser', 'senderUser')
      .leftJoinAndSelect('msg.senderAccount', 'senderAccount')
      .where('msg.conversationId = :conversationId', { conversationId });

    if (query.before) {
      qb.andWhere('msg.createdAt < :before', { before: query.before });
    }

    qb.orderBy('msg.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    // Reverse to chronological order (oldest to newest) for client convenience
    return {
      data: data.reverse(),
      total,
      page,
      limit,
    };
  }

  /**
   * Send a message to a conversation.
   *
   * @param conversationId Target conversation UUID
   * @param dto Message payload
   * @param sender Sender context
   * @returns Created Message entity
   */
  async sendMessage(
    conversationId: string,
    dto: SendMessageDto,
    sender: {
      senderType: SenderType;
      staffUserId?: string;
      accountId?: string;
      staffFacilityId?: string;
    },
  ): Promise<Message> {
    const conversation = await this.findById(
      conversationId,
      sender.staffFacilityId,
      sender.accountId,
    );

    if (conversation.status === ConversationStatus.CLOSED) {
      throw new BadRequest('Phòng chat này đã bị đóng, không thể gửi tin nhắn mới');
    }

    if (conversation.status === ConversationStatus.ARCHIVED) {
      throw new BadRequest('Phòng chat này đã được lưu trữ');
    }

    const now = new Date();
    const message = this.messageRepo.create({
      conversationId: conversation.id,
      senderType: sender.senderType,
      senderUserId: sender.staffUserId ?? null,
      senderAccountId: sender.accountId ?? null,
      messageType: dto.messageType ?? MessageType.TEXT,
      content: dto.content.trim(),
      resourceId: dto.resourceId ?? null,
      mediaUrl: dto.mediaUrl ?? null,
      replyToMessageId: dto.replyToMessageId ?? null,
      isPinned: false,
      isDeleted: false,
    });

    const savedMessage = await this.messageRepo.save(message);

    // Update conversation metadata
    conversation.lastMessageId = savedMessage.id;
    conversation.lastMessageAt = now;
    conversation.lastMessagePreview = dto.content.trim().substring(0, 250);
    await this.conversationRepo.save(conversation);

    return savedMessage;
  }

  /**
   * Pin or unpin a message.
   *
   * @param messageId Message UUID
   * @param isPinned Pin flag
   * @param staffFacilityId Staff facility
   * @returns Updated Message
   */
  async pinMessage(
    messageId: string,
    isPinned: boolean,
    staffFacilityId?: string,
  ): Promise<Message> {
    const message = await this.messageRepo.findOne({
      where: { id: messageId },
      relations: ['conversation'],
    });

    if (!message) {
      throw new NotFound(`Không tìm thấy tin nhắn với ID ${messageId}`);
    }

    if (staffFacilityId && message.conversation?.facilityId !== staffFacilityId) {
      throw new Forbidden('Bạn không có quyền thao tác trên tin nhắn của cơ sở y tế khác');
    }

    message.isPinned = isPinned;
    return this.messageRepo.save(message);
  }

  /**
   * Delete / Recall a message.
   *
   * @param messageId Message UUID
   * @param staffFacilityId Optional staff facility
   * @param staffUserId Optional staff user ID
   * @param accountId Optional patient account ID
   * @returns Deleted Message
   */
  async deleteMessage(
    messageId: string,
    staffFacilityId?: string,
    staffUserId?: string,
    accountId?: string,
  ): Promise<Message> {
    const message = await this.messageRepo.findOne({
      where: { id: messageId },
      relations: ['conversation'],
    });

    if (!message) {
      throw new NotFound(`Không tìm thấy tin nhắn với ID ${messageId}`);
    }

    if (staffFacilityId && message.conversation?.facilityId !== staffFacilityId) {
      throw new Forbidden('Bạn không có quyền thao tác trên tin nhắn của cơ sở y tế khác');
    }

    // Ownership check
    if (staffUserId && message.senderUserId && message.senderUserId !== staffUserId) {
      throw new Forbidden('Bạn chỉ có thể thu hồi tin nhắn do chính mình gửi');
    }

    if (accountId && message.senderAccountId && message.senderAccountId !== accountId) {
      throw new Forbidden('Bạn chỉ có thể thu hồi tin nhắn do chính mình gửi');
    }

    message.isDeleted = true;
    message.content = 'Tin nhắn đã được thu hồi';
    return this.messageRepo.save(message);
  }
}
