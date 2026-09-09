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

  const mockConversationRepo = {
    create: jest.fn().mockImplementation((dto: Partial<Conversation>): Conversation => dto as Conversation),
    save: jest.fn().mockImplementation((entity: Partial<Conversation>): Promise<Conversation> => Promise.resolve({ id: 'conv-1', ...entity } as Conversation)),
    findOne: jest.fn().mockImplementation((options: { where: Record<string, unknown> }) => {
      if (options.where.id === 'conv-1') {
        return Promise.resolve({ ...mockConversation });
      }
      return Promise.resolve(null);
    }),
    createQueryBuilder: jest.fn().mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockConversation], 1]),
    }),
  };

  const mockMessageRepo = {
    create: jest.fn().mockImplementation((dto: Partial<Message>): Message => dto as Message),
    save: jest.fn().mockImplementation((entity: Partial<Message>): Promise<Message> => Promise.resolve({ id: 'msg-1', ...entity } as Message)),
    findOne: jest.fn().mockImplementation((options: { where: Record<string, unknown> }) => {
      if (options.where.id === 'msg-1') {
        return Promise.resolve({ ...mockMessage });
      }
      return Promise.resolve(null);
    }),
    createQueryBuilder: jest.fn().mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockMessage], 1]),
    }),
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
          status: ConversationStatus.ACTIVE,
        }),
      );
    });

    it('should return existing conversation if already exists', async () => {
      mockConversationRepo.findOne.mockResolvedValueOnce({ ...mockConversation });

      const result = await service.createDirectConversation(
        { healthProfileId: 'profile-1', directUserId: 'doc-1' },
        undefined,
        'account-1',
      );

      expect(result.id).toBe('conv-1');
    });

    it('should throw NotFound if profile does not exist', async () => {
      await expect(
        service.createDirectConversation(
          { healthProfileId: 'invalid-id', directUserId: 'doc-1' },
          undefined,
          'account-1',
        ),
      ).rejects.toThrow(NotFound);
    });

    it('should throw Forbidden if caller does not own the profile', async () => {
      await expect(
        service.createDirectConversation(
          { healthProfileId: 'profile-1', directUserId: 'doc-1' },
          undefined,
          'wrong-account',
        ),
      ).rejects.toThrow(Forbidden);
    });
  });

  describe('findAll', () => {
    it('should return paginated conversations', async () => {
      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('findById', () => {
    it('should return conversation if found', async () => {
      const result = await service.findById('conv-1', 'facility-1');
      expect(result).toBeDefined();
      expect(result.id).toBe('conv-1');
    });

    it('should throw NotFound if conversation missing', async () => {
      mockConversationRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.findById('non-existing')).rejects.toThrow(NotFound);
    });

    it('should throw Forbidden if staff belongs to another facility', async () => {
      await expect(service.findById('conv-1', 'diff-facility')).rejects.toThrow(Forbidden);
    });
  });

  describe('getMessages', () => {
    it('should return list of messages in conversation', async () => {
      const result = await service.getMessages('conv-1', { page: 1, limit: 20 }, 'facility-1');
      expect(result.data).toBeDefined();
      expect(result.total).toBe(1);
    });
  });

  describe('sendMessage', () => {
    it('should send a message and update conversation metadata', async () => {
      const result = await service.sendMessage(
        'conv-1',
        { content: 'Bác sĩ phản hồi kết quả' },
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
          { content: 'Tin nhắn gửi vào phòng đóng' },
          { senderType: SenderType.STAFF, staffUserId: 'doc-1', staffFacilityId: 'facility-1' },
        ),
      ).rejects.toThrow(BadRequest);
    });
  });

  describe('pinMessage', () => {
    it('should pin a message', async () => {
      const result = await service.pinMessage('msg-1', true, 'facility-1');
      expect(result.isPinned).toBe(true);
    });

    it('should throw NotFound if message missing', async () => {
      mockMessageRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.pinMessage('invalid', true, 'facility-1')).rejects.toThrow(NotFound);
    });
  });

  describe('deleteMessage', () => {
    it('should recall message', async () => {
      const result = await service.deleteMessage(
        'msg-1',
        undefined,
        undefined,
        'account-1',
      );

      expect(result.isDeleted).toBe(true);
      expect(result.content).toBe('Tin nhắn đã được thu hồi');
    });

    it('should throw Forbidden if user is not the sender', async () => {
      await expect(
        service.deleteMessage(
          'msg-1',
          undefined,
          undefined,
          'wrong-account',
        ),
      ).rejects.toThrow(Forbidden);
    });
  });
});
