import {
  ConversationStatus,
  ConversationType,
  MessageType,
  SenderType,
  StaffRole,
} from '@/commons/enums/vndoctor.enum';
import { BadRequest, Forbidden, NotFound } from '@/commons/exceptions';
import { Account } from '@/modules/accounts/entities/account.entity';
import { PatientCareSubscription } from '@/modules/care-subscriptions/entities/care-subscription.entity';
import { Conversation } from '@/modules/care-subscriptions/entities/conversation.entity';
import { Message } from '@/modules/care-subscriptions/entities/message.entity';
import { HealthProfile } from '@/modules/health-profiles/entities/health-profile.entity';
import { StaffUser } from '@/modules/staff/entities/staff-user.entity';
import { StorageService } from '@/services/storage/storage.service';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConversationsService } from './conversations.service';

describe('ConversationsService', () => {
  let service: ConversationsService;

  const mockProfile: Partial<HealthProfile> = {
    id: 'profile-1',
    accountId: 'account-1',
    fullName: 'Trần Thị Mai',
  };

  const mockDoctor: Partial<StaffUser> = {
    id: 'doc-1',
    facilityId: 'facility-1',
    fullName: 'BS. CKII Nguyễn Văn An',
    role: StaffRole.DOCTOR,
    isActive: true,
  };

  const mockConversation: Partial<Conversation> = {
    id: 'conv-1',
    facilityId: 'facility-1',
    type: ConversationType.DIRECT,
    status: ConversationStatus.ACTIVE,
    healthProfileId: 'profile-1',
    directUserId: 'doc-1',
    title: 'Tư vấn: Trần Thị Mai - BS. CKII Nguyễn Văn An',
    healthProfile: mockProfile as HealthProfile,
    directUser: mockDoctor as StaffUser,
    isPinned: false,
  };

  const mockMessage: Partial<Message> = {
    id: 'msg-1',
    conversationId: 'conv-1',
    senderType: SenderType.PATIENT,
    senderAccountId: 'account-1',
    messageType: MessageType.TEXT,
    content: 'Chào bác sĩ, hôm nay tôi thấy hơi mệt.',
    isPinned: false,
    isDeleted: false,
    createdAt: new Date(),
    conversation: mockConversation as Conversation,
  };

  const mockConversationQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[mockConversation], 1]),
  };

  const mockConversationRepo = {
    create: jest.fn().mockImplementation((dto: Partial<Conversation>): Conversation => dto as Conversation),
    save: jest.fn().mockImplementation((entity: Partial<Conversation>): Promise<Conversation> => Promise.resolve({ id: 'conv-1', ...entity } as Conversation)),
    findOne: jest.fn().mockImplementation((options: { where: Record<string, unknown> }) => {
      if (options.where.id === 'conv-1') {
        return Promise.resolve({ ...mockConversation });
      }
      return Promise.resolve(null);
    }),
    createQueryBuilder: jest.fn().mockReturnValue(mockConversationQueryBuilder),
  };

  const mockMessageQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[mockMessage], 1]),
    getMany: jest.fn().mockResolvedValue([mockMessage]),
  };

  const mockMessageRepo = {
    create: jest.fn().mockImplementation((dto: Partial<Message>): Message => dto as Message),
    save: jest.fn().mockImplementation((entity: Partial<Message>): Promise<Message> => Promise.resolve({ id: 'msg-1', ...entity } as Message)),
    find: jest.fn().mockResolvedValue([mockMessage]),
    findOne: jest.fn().mockImplementation((options: { where: Record<string, unknown> }) => {
      if (options.where.id === 'msg-1' || options.where.id === '018fa300-0000-7000-8000-000000000001') {
        return Promise.resolve({ ...mockMessage });
      }
      return Promise.resolve(null);
    }),
    createQueryBuilder: jest.fn().mockReturnValue(mockMessageQueryBuilder),
  };

  const mockHealthProfileRepo = {
    findOne: jest.fn().mockImplementation((options: { where: Record<string, unknown> }) => {
      if (options.where.id === 'profile-1') {
        return Promise.resolve({ ...mockProfile });
      }
      return Promise.resolve(null);
    }),
  };

  const mockStaffUserRepo = {
    findOne: jest.fn().mockImplementation((options: { where: Record<string, unknown> }) => {
      if (options.where.id === 'doc-1') {
        return Promise.resolve({ ...mockDoctor });
      }
      return Promise.resolve(null);
    }),
  };

  const mockAccountRepo = {
    findOne: jest.fn().mockResolvedValue({ id: 'account-1' }),
  };

  const mockSubscriptionRepo = {
    findOne: jest.fn().mockResolvedValue(null),
  };

  const mockStorageService = {
    uploadFile: jest.fn().mockResolvedValue({
      url: 'https://storage.example.com/chat/photo.jpg',
      size: 1024,
      mimeType: 'image/jpeg',
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConversationsService,
        { provide: getRepositoryToken(Conversation), useValue: mockConversationRepo },
        { provide: getRepositoryToken(Message), useValue: mockMessageRepo },
        { provide: getRepositoryToken(HealthProfile), useValue: mockHealthProfileRepo },
        { provide: getRepositoryToken(StaffUser), useValue: mockStaffUserRepo },
        { provide: getRepositoryToken(Account), useValue: mockAccountRepo },
        { provide: getRepositoryToken(PatientCareSubscription), useValue: mockSubscriptionRepo },
        { provide: StorageService, useValue: mockStorageService },
      ],
    }).compile();

    service = module.get<ConversationsService>(ConversationsService);
  });

  describe('createDirectConversation', () => {
    it('should create a new direct conversation', async () => {
      mockConversationRepo.findOne.mockResolvedValueOnce(null);

      const result = await service.createDirectConversation(
        { healthProfileId: 'profile-1', directUserId: 'doc-1' },
        undefined,
        'account-1',
      );

      expect(result).toBeDefined();
      expect(mockConversationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: ConversationType.DIRECT,
          healthProfileId: 'profile-1',
          directUserId: 'doc-1',
        }),
      );
    });

    it('should return existing conversation if one already exists', async () => {
      mockConversationRepo.findOne.mockResolvedValueOnce(mockConversation);

      const result = await service.createDirectConversation(
        { healthProfileId: 'profile-1', directUserId: 'doc-1' },
        undefined,
        'account-1',
      );

      expect(result).toEqual(mockConversation);
      expect(mockConversationRepo.create).not.toHaveBeenCalled();
    });

    it('should throw NotFound if Health Profile does not exist', async () => {
      mockHealthProfileRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.createDirectConversation({ healthProfileId: 'non-existent', directUserId: 'doc-1' }),
      ).rejects.toThrow(NotFound);
    });

    it('should throw NotFound if Doctor does not exist', async () => {
      mockStaffUserRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.createDirectConversation({ healthProfileId: 'profile-1', directUserId: 'non-existent' }),
      ).rejects.toThrow(NotFound);
    });
  });

  describe('findAll', () => {
    it('should query conversations with filters and pin ordering', async () => {
      const result = await service.findAll(
        { type: ConversationType.DIRECT, page: 1, limit: 10 },
        'facility-1',
      );

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should filter conversations for staff member by staffUserId', async () => {
      const result = await service.findAll(
        { page: 1, limit: 20 },
        'facility-1',
        'doc-1',
      );

      expect(result.data).toHaveLength(1);
      expect(mockConversationQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(conv.directUserId = :staffUserId OR sub.assignedDoctorId = :staffUserId OR sub.assignedNurseId = :staffUserId OR sub.assignedExpertId = :staffUserId)',
        { staffUserId: 'doc-1' },
      );
    });
  });

  describe('getMessages & Cursor Pagination', () => {
    it('should retrieve messages with ISO Date cursor and avoid skip', async () => {
      const result = await service.getMessages(
        'conv-1',
        { before: '2026-09-08T10:00:00.000Z', limit: 20 },
        'facility-1',
      );

      expect(result.data).toBeDefined();
      expect(mockMessageQueryBuilder.andWhere).toHaveBeenCalledWith(
        'msg.createdAt < :beforeDate',
        expect.objectContaining({ beforeDate: expect.any(Date) }),
      );
      // When cursor is used, skip should NOT be called
      expect(mockMessageQueryBuilder.skip).not.toHaveBeenCalled();
    });

    it('should resolve UUID message cursor when before is a UUID', async () => {
      const uuidCursor = '018fa300-0000-7000-8000-000000000001';
      const result = await service.getMessages(
        'conv-1',
        { before: uuidCursor, limit: 20 },
        'facility-1',
      );

      expect(result.data).toBeDefined();
      expect(mockMessageRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: uuidCursor, conversationId: 'conv-1' } }),
      );
    });

    it('should apply skip when no cursor is provided (offset pagination)', async () => {
      const result = await service.getMessages(
        'conv-1',
        { page: 2, limit: 20 },
        'facility-1',
      );

      expect(result.data).toBeDefined();
      expect(mockMessageQueryBuilder.skip).toHaveBeenCalledWith(20);
    });
  });

  describe('sendMessage', () => {
    it('should save and return new message and update conversation preview', async () => {
      const result = await service.sendMessage(
        'conv-1',
        { content: 'Bác sĩ đã xem tin nhắn', messageType: MessageType.TEXT },
        { senderType: SenderType.STAFF, staffUserId: 'doc-1', staffFacilityId: 'facility-1' },
      );

      expect(result).toBeDefined();
      expect(mockMessageRepo.save).toHaveBeenCalled();
      expect(mockConversationRepo.save).toHaveBeenCalled();
    });

    it('should throw BadRequest if conversation is CLOSED', async () => {
      mockConversationRepo.findOne.mockResolvedValueOnce({
        ...mockConversation,
        status: ConversationStatus.CLOSED,
      });

      await expect(
        service.sendMessage(
          'conv-1',
          { content: 'Tin nhắn' },
          { senderType: SenderType.PATIENT, accountId: 'account-1' },
        ),
      ).rejects.toThrow(BadRequest);
    });
  });

  describe('markAsRead', () => {
    it('should mark conversation as read', async () => {
      const result = await service.markAsRead('conv-1', {
        staffUserId: 'doc-1',
        staffFacilityId: 'facility-1',
      });

      expect(result.success).toBe(true);
      expect(result.conversationId).toBe('conv-1');
      expect(result.readAt).toBeInstanceOf(Date);
    });
  });

  describe('pinConversation & deleteConversation', () => {
    it('should pin a conversation', async () => {
      const result = await service.pinConversation('conv-1', { isPinned: true }, 'facility-1');

      expect(result.isPinned).toBe(true);
      expect(mockConversationRepo.save).toHaveBeenCalled();
    });

    it('should close/delete a conversation', async () => {
      const result = await service.deleteConversation('conv-1', 'facility-1');

      expect(result.success).toBe(true);
      expect(mockConversationRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: ConversationStatus.CLOSED }),
      );
    });
  });

  describe('searchMessages & getPinnedMessages', () => {
    it('should search messages by keyword', async () => {
      const result = await service.searchMessages('conv-1', 'huyết áp', 'facility-1');

      expect(result).toBeDefined();
      expect(mockMessageQueryBuilder.andWhere).toHaveBeenCalledWith(
        'msg.content ILIKE :kw',
        { kw: '%huyết áp%' },
      );
    });

    it('should retrieve pinned messages in conversation', async () => {
      const result = await service.getPinnedMessages('conv-1', 'facility-1');

      expect(result).toBeDefined();
      expect(mockMessageRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ conversationId: 'conv-1', isPinned: true }),
        }),
      );
    });
  });

  describe('uploadChatMedia & getConversationResources', () => {
    it('should upload chat media via storage service', async () => {
      const mockFile = {
        originalname: 'test.jpg',
        buffer: Buffer.from('test'),
      } as Express.Multer.File;

      const result = await service.uploadChatMedia('conv-1', mockFile, {
        staffUserId: 'doc-1',
        staffFacilityId: 'facility-1',
      });

      expect(result.mediaUrl).toBe('https://storage.example.com/chat/photo.jpg');
      expect(mockStorageService.uploadFile).toHaveBeenCalled();
    });

    it('should query conversation resources in resource hub', async () => {
      const result = await service.getConversationResources(
        'conv-1',
        { type: MessageType.IMAGE, page: 1, limit: 10 },
        'facility-1',
      );

      expect(result.data).toBeDefined();
      expect(result.total).toBe(1);
    });
  });

  describe('pinMessage & deleteMessage', () => {
    it('should pin message successfully', async () => {
      const result = await service.pinMessage('msg-1', true, 'facility-1');
      expect(result.isPinned).toBe(true);
    });

    it('should throw NotFound when pinning non-existent message', async () => {
      mockMessageRepo.findOne.mockResolvedValueOnce(null);

      await expect(service.pinMessage('non-existent', true, 'facility-1')).rejects.toThrow(
        NotFound,
      );
    });

    it('should delete message when caller is owner', async () => {
      const result = await service.deleteMessage(
        'msg-1',
        'facility-1',
        undefined,
        'account-1',
      );

      expect(result.isDeleted).toBe(true);
      expect(result.content).toBe('Tin nhắn đã được thu hồi');
    });

    it('should throw Forbidden when caller is not sender', async () => {
      await expect(
        service.deleteMessage('msg-1', 'facility-1', undefined, 'different-account'),
      ).rejects.toThrow(Forbidden);
    });
  });
});
