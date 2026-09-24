import {
  ConversationStatus,
  ConversationType,
  MessageType,
  SenderType,
} from '@/commons/enums/vndoctor.enum';
import { BadRequest, ErrorCode, Forbidden, NotFound } from '@/commons/exceptions';
import { Account } from '@/modules/accounts/entities/account.entity';
import { PatientCareSubscription } from '@/modules/care-subscriptions/entities/care-subscription.entity';
import { Conversation } from '@/modules/care-subscriptions/entities/conversation.entity';
import { Message } from '@/modules/care-subscriptions/entities/message.entity';
import { HealthProfile } from '@/modules/health-profiles/entities/health-profile.entity';
import { StaffUser } from '@/modules/staff/entities/staff-user.entity';
import { StorageService } from '@/services/storage/storage.service';
import { StoragePath } from '@/services/storage/storage.enums';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CreateDirectConversationDto,
  PinConversationDto,
  QueryConversationDto,
  QueryConversationResourceDto,
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
    private readonly storageService: StorageService,
  ) {}

  /**
   * Helper to check if a string is a valid UUID v4 / v7.
   *
   * @param str Candidate string
   * @returns True if UUID format
   */
  private isUuid(str: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
  }

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
      throw new NotFound(
        ErrorCode.HEALTH_PROFILE_NOT_FOUND,
        `Không tìm thấy hồ sơ sức khỏe với mã ID: ${dto.healthProfileId}`,
      );
    }

    if (callerAccountId && profile.accountId !== callerAccountId) {
      throw new Forbidden(
        ErrorCode.HEALTH_PROFILE_ACCESS_DENIED,
        'Bạn không có quyền tạo cuộc trò chuyện cho hồ sơ sức khỏe của người khác',
      );
    }

    // 2. Validate Target Doctor / Staff
    const doctor = await this.staffUserRepo.findOne({
      where: { id: dto.directUserId },
    });
    if (!doctor) {
      throw new NotFound(
        ErrorCode.STAFF_NOT_FOUND,
        `Không tìm thấy bác sĩ / nhân viên y tế với mã ID: ${dto.directUserId}`,
      );
    }

    if (!doctor.isActive) {
      throw new BadRequest(
        ErrorCode.STAFF_INACTIVE,
        `Tài khoản bác sĩ "${doctor.fullName}" hiện đang bị tạm khóa`,
      );
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
      facilityId: doctor.facilityId || '',
      type: ConversationType.DIRECT,
      status: ConversationStatus.ACTIVE,
      healthProfileId: dto.healthProfileId,
      directUserId: dto.directUserId,
      title: `Tư vấn: ${profile.fullName} - ${doctor.fullName}`,
      isPinned: false,
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

    if (staffUserId) {
      qb.andWhere(
        '(conv.directUserId = :staffUserId OR sub.assignedDoctorId = :staffUserId OR sub.assignedNurseId = :staffUserId OR sub.assignedExpertId = :staffUserId)',
        { staffUserId },
      );
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

    // Pinned conversations float to top, followed by latest message time
    qb.orderBy('conv.isPinned', 'DESC')
      .addOrderBy('conv.lastMessageAt', 'DESC', 'NULLS LAST')
      .addOrderBy('conv.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    const [data, total] = await qb.getManyAndCount();

    return { data, total, page, limit };
  }

  /**
   * Find conversation by UUID with all relations.
   * Enforces multi-tenancy access:
   * - Staff can only access conversations within their own facility.
   * - Patient (app user) can only access conversations of their own health profile.
   *
   * @param id Conversation UUID
   * @param staffFacilityId Facility ID of the authenticated staff
   * @param accountId App Account ID of authenticated patient
   * @returns Conversation entity
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
      throw new NotFound(
        ErrorCode.CONVERSATION_NOT_FOUND,
        `Không tìm thấy cuộc trò chuyện với mã ID: ${id}`,
      );
    }

    if (staffFacilityId && conversation.facilityId && conversation.facilityId !== staffFacilityId) {
      throw new Forbidden(
        ErrorCode.FACILITY_ACCESS_DENIED,
        'Bạn không có quyền truy cập cuộc trò chuyện của cơ sở y tế khác',
      );
    }

    if (accountId) {
      const isOwner =
        conversation.healthProfile?.accountId === accountId ||
        conversation.subscription?.healthProfile?.accountId === accountId;

      if (!isOwner) {
        throw new Forbidden(
          ErrorCode.CONVERSATION_ACCESS_DENIED,
          'Bạn không phải là thành viên tham gia cuộc trò chuyện này',
        );
      }
    }

    return conversation;
  }

  /**
   * Get messages inside a conversation with cursor / pagination.
   * Resolves before/after either as ISO Date or as Message UUID.
   * Avoids skip duplication when cursor is used.
   *
   * @param conversationId Conversation UUID
   * @param query Pagination and cursor params
   * @param staffFacilityId Staff facility
   * @param accountId Patient account ID
   * @returns List of messages in chronological order
   */
  async getMessages(
    conversationId: string,
    query: QueryMessageDto,
    staffFacilityId?: string,
    accountId?: string,
  ): Promise<{ data: Message[]; total: number; page: number; limit: number }> {
    // 1. Validate conversation access
    await this.findById(conversationId, staffFacilityId, accountId);

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 30));
    const skip = (page - 1) * limit;

    const qb = this.messageRepo
      .createQueryBuilder('msg')
      .leftJoinAndSelect('msg.senderUser', 'senderUser')
      .leftJoinAndSelect('msg.senderAccount', 'senderAccount')
      .where('msg.conversationId = :conversationId', { conversationId });

    let hasCursor = false;

    // 2. Resolve 'before' cursor (Load older messages)
    if (query.before) {
      let beforeDate: Date | undefined;
      if (this.isUuid(query.before)) {
        const refMessage = await this.messageRepo.findOne({
          where: { id: query.before, conversationId },
        });
        if (refMessage) {
          beforeDate = refMessage.createdAt;
        }
      } else {
        const parsed = new Date(query.before);
        if (!isNaN(parsed.getTime())) {
          beforeDate = parsed;
        }
      }

      if (beforeDate) {
        qb.andWhere('msg.createdAt < :beforeDate', { beforeDate });
        hasCursor = true;
      }
    }

    // 3. Resolve 'after' cursor (Load newer messages)
    if (query.after) {
      let afterDate: Date | undefined;
      if (this.isUuid(query.after)) {
        const refMessage = await this.messageRepo.findOne({
          where: { id: query.after, conversationId },
        });
        if (refMessage) {
          afterDate = refMessage.createdAt;
        }
      } else {
        const parsed = new Date(query.after);
        if (!isNaN(parsed.getTime())) {
          afterDate = parsed;
        }
      }

      if (afterDate) {
        qb.andWhere('msg.createdAt > :afterDate', { afterDate });
        hasCursor = true;
      }
    }

    // 4. Keyword search filter
    if (query.keyword) {
      qb.andWhere('msg.content ILIKE :kw', { kw: `%${query.keyword.trim()}%` });
    }

    // 5. Pagination: If cursor is used, do NOT apply skip to prevent skipping items
    qb.orderBy('msg.createdAt', 'DESC');

    if (!hasCursor) {
      qb.skip(skip);
    }
    qb.take(limit);

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
      throw new BadRequest(
        ErrorCode.CONVERSATION_CLOSED,
        'Cuộc trò chuyện đã được đóng lại, không thể gửi thêm tin nhắn mới',
      );
    }

    if (conversation.status === ConversationStatus.ARCHIVED) {
      throw new BadRequest(
        ErrorCode.CONVERSATION_ARCHIVED,
        'Cuộc trò chuyện đã được lưu trữ (Archived), không thể gửi thêm tin nhắn',
      );
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
   * Mark a conversation as read by the authenticated user.
   *
   * @param conversationId Conversation UUID
   * @param reader Reader context
   * @returns Success status with read timestamp
   */
  async markAsRead(
    conversationId: string,
    reader: { staffUserId?: string; accountId?: string; staffFacilityId?: string },
  ): Promise<{ success: boolean; conversationId: string; readAt: Date }> {
    await this.findById(conversationId, reader.staffFacilityId, reader.accountId);

    return {
      success: true,
      conversationId,
      readAt: new Date(),
    };
  }

  /**
   * Pin or unpin a conversation for fast access.
   *
   * @param conversationId Conversation UUID
   * @param dto Pin/Unpin flag
   * @param staffFacilityId Optional staff facility
   * @param accountId Optional account ID
   * @returns Updated Conversation
   */
  async pinConversation(
    conversationId: string,
    dto: PinConversationDto,
    staffFacilityId?: string,
    accountId?: string,
  ): Promise<Conversation> {
    const conversation = await this.findById(conversationId, staffFacilityId, accountId);

    conversation.isPinned = dto.isPinned;
    conversation.pinnedAt = dto.isPinned ? new Date() : null;
    return this.conversationRepo.save(conversation);
  }

  /**
   * Soft delete / Close a conversation.
   *
   * @param conversationId Conversation UUID
   * @param staffFacilityId Optional staff facility
   * @param accountId Optional account ID
   * @returns Success status
   */
  async deleteConversation(
    conversationId: string,
    staffFacilityId?: string,
    accountId?: string,
  ): Promise<{ success: boolean; message: string }> {
    const conversation = await this.findById(conversationId, staffFacilityId, accountId);

    conversation.status = ConversationStatus.CLOSED;
    await this.conversationRepo.save(conversation);

    return {
      success: true,
      message: 'Conversation closed successfully',
    };
  }

  /**
   * Search messages across a conversation by keyword.
   *
   * @param conversationId Conversation UUID
   * @param keyword Search term
   * @param staffFacilityId Optional staff facility
   * @param accountId Optional account ID
   * @returns Matching messages
   */
  async searchMessages(
    conversationId: string,
    keyword: string,
    staffFacilityId?: string,
    accountId?: string,
  ): Promise<Message[]> {
    await this.findById(conversationId, staffFacilityId, accountId);

    if (!keyword || !keyword.trim()) {
      return [];
    }

    return this.messageRepo
      .createQueryBuilder('msg')
      .leftJoinAndSelect('msg.senderUser', 'senderUser')
      .leftJoinAndSelect('msg.senderAccount', 'senderAccount')
      .where('msg.conversationId = :conversationId', { conversationId })
      .andWhere('msg.isDeleted = false')
      .andWhere('msg.content ILIKE :kw', { kw: `%${keyword.trim()}%` })
      .orderBy('msg.createdAt', 'DESC')
      .take(50)
      .getMany();
  }

  /**
   * Get all pinned messages in a conversation.
   *
   * @param conversationId Conversation UUID
   * @param staffFacilityId Optional staff facility
   * @param accountId Optional account ID
   * @returns Pinned messages list
   */
  async getPinnedMessages(
    conversationId: string,
    staffFacilityId?: string,
    accountId?: string,
  ): Promise<Message[]> {
    await this.findById(conversationId, staffFacilityId, accountId);

    return this.messageRepo.find({
      where: {
        conversationId,
        isPinned: true,
        isDeleted: false,
      },
      relations: ['senderUser', 'senderAccount'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Upload chat media (image, audio, document) and return media URL + metadata.
   *
   * @param conversationId Conversation UUID
   * @param file Express multer file
   * @param uploader Uploader context
   * @returns Media URL and metadata
   */
  async uploadChatMedia(
    conversationId: string,
    file: Express.Multer.File,
    uploader: { staffUserId?: string; accountId?: string; staffFacilityId?: string },
  ): Promise<{ mediaUrl: string; size: number; mimeType: string }> {
    await this.findById(conversationId, uploader.staffFacilityId, uploader.accountId);

    if (!file) {
      throw new BadRequest(
        ErrorCode.FILE_REQUIRED,
        'Yêu cầu tải lên tệp đính kèm (ảnh, tài liệu, file âm thanh)',
      );
    }

    const uploaded = await this.storageService.uploadFile(
      file,
      true,
      StoragePath.CHAT,
      { allowAnyMime: true },
    );

    return {
      mediaUrl: uploaded.url,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  /**
   * Resource Hub: Retrieve shared attachments, examinations, records, and reports in a conversation.
   *
   * @param conversationId Conversation UUID
   * @param query Resource query filters and pagination
   * @param staffFacilityId Optional staff facility
   * @param accountId Optional account ID
   * @returns Paginated list of shared resources
   */
  async getConversationResources(
    conversationId: string,
    query: QueryConversationResourceDto,
    staffFacilityId?: string,
    accountId?: string,
  ): Promise<{ data: Message[]; total: number; page: number; limit: number }> {
    await this.findById(conversationId, staffFacilityId, accountId);

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const qb = this.messageRepo
      .createQueryBuilder('msg')
      .leftJoinAndSelect('msg.senderUser', 'senderUser')
      .leftJoinAndSelect('msg.senderAccount', 'senderAccount')
      .where('msg.conversationId = :conversationId', { conversationId })
      .andWhere('msg.isDeleted = false');

    if (query.type) {
      qb.andWhere('msg.messageType = :type', { type: query.type });
    } else {
      // Return all non-text or attachment messages
      qb.andWhere(
        '(msg.resourceId IS NOT NULL OR msg.mediaUrl IS NOT NULL OR msg.messageType != :textType)',
        { textType: MessageType.TEXT },
      );
    }

    qb.orderBy('msg.createdAt', 'DESC').skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return { data, total, page, limit };
  }

  /**
   * Update conversation status (e.g. CLOSE, ARCHIVE, REOPEN).
   *
   * @param conversationId Conversation UUID
   * @param status New conversation status
   * @param staffFacilityId Staff facility ID for authorization check
   * @returns Updated Conversation
   */
  async updateStatus(
    conversationId: string,
    status: ConversationStatus,
    staffFacilityId?: string,
  ): Promise<Conversation> {
    const conversation = await this.findById(conversationId, staffFacilityId);
    conversation.status = status;
    return this.conversationRepo.save(conversation);
  }

  /**
   * Pin or unpin a message inside a conversation.
   *
   * @param messageId Message UUID
   * @param isPinned Pin flag
   * @param staffFacilityId Optional staff facility
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
      throw new NotFound(
        ErrorCode.CONVERSATION_MESSAGE_NOT_FOUND,
        `Không tìm thấy tin nhắn với mã ID: ${messageId}`,
      );
    }

    if (staffFacilityId && message.conversation?.facilityId && message.conversation.facilityId !== staffFacilityId) {
      throw new Forbidden(
        ErrorCode.FACILITY_ACCESS_DENIED,
        'Bạn không có quyền ghim tin nhắn của cơ sở y tế khác',
      );
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
      throw new NotFound(
        ErrorCode.CONVERSATION_MESSAGE_NOT_FOUND,
        `Không tìm thấy tin nhắn với mã ID: ${messageId}`,
      );
    }

    if (staffFacilityId && message.conversation?.facilityId && message.conversation.facilityId !== staffFacilityId) {
      throw new Forbidden(
        ErrorCode.FACILITY_ACCESS_DENIED,
        'Bạn không có quyền thu hồi tin nhắn của cơ sở y tế khác',
      );
    }

    // Ownership check: only sender can delete
    if (staffUserId && message.senderUserId && message.senderUserId !== staffUserId) {
      throw new Forbidden(
        ErrorCode.CONVERSATION_MESSAGE_CANNOT_DELETE,
        'Bạn chỉ có thể thu hồi tin nhắn do chính bạn gửi',
      );
    }

    if (accountId && message.senderAccountId && message.senderAccountId !== accountId) {
      throw new Forbidden(
        ErrorCode.CONVERSATION_MESSAGE_CANNOT_DELETE,
        'Bạn chỉ có thể thu hồi tin nhắn do chính bạn gửi',
      );
    }

    message.isDeleted = true;
    message.content = 'Tin nhắn đã được thu hồi';
    return this.messageRepo.save(message);
  }
}
