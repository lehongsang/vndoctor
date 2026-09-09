import {
  CarePackageStatus,
  CarePackageType,
  CareRequestStatus,
  CareSubscriptionStatus,
  ConversationStatus,
  ConversationType,
  StaffRole,
} from '@/commons/enums/vndoctor.enum';
import { BadRequest, Forbidden, NotFound } from '@/commons/exceptions';
import { PatientCareSubscription } from '@/modules/care-subscriptions/entities/care-subscription.entity';
import { Conversation } from '@/modules/care-subscriptions/entities/conversation.entity';
import { Message } from '@/modules/care-subscriptions/entities/message.entity';
import { Facility } from '@/modules/facilities/entities/facility.entity';
import { StaffUser } from '@/modules/staff/entities/staff-user.entity';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CareRequestsService } from './care-requests.service';
import { PatientCareRequest } from './entities/care-request.entity';

describe('CareRequestsService', () => {
  let service: CareRequestsService;

  const mockFacility: Partial<Facility> = {
    id: 'facility-1',
    facilityName: 'Bệnh viện Đa khoa Quốc tế',
  };

  const mockDoctor: Partial<StaffUser> = {
    id: 'doc-1',
    facilityId: 'facility-1',
    fullName: 'BS. CKII Nguyễn Văn An',
    role: StaffRole.DOCTOR,
    isActive: true,
  };

  const mockNurse: Partial<StaffUser> = {
    id: 'nurse-1',
    facilityId: 'facility-1',
    fullName: 'ĐD. Lê Thị Bích',
    role: StaffRole.NURSE,
    isActive: true,
  };

  const mockActiveSubscription: Partial<PatientCareSubscription> = {
    id: 'sub-1',
    healthProfileId: 'profile-1',
    carePackageId: 'pkg-1',
    status: CareSubscriptionStatus.ACTIVE,
    assignedDoctorId: 'doc-1',
    assignedNurseId: 'nurse-1',
    carePackage: {
      id: 'pkg-1',
      facilityId: 'facility-1',
      name: 'Gói Chăm Sóc Tim Mạch',
      type: CarePackageType.STANDARD,
      durationDays: 30,
      priceAmount: 1500000,
      status: CarePackageStatus.ACTIVE,
    } as any,
    healthProfile: {
      id: 'profile-1',
      accountId: 'account-1',
      fullName: 'Trần Thị Mai',
    } as any,
  };

  const mockCareRequest: Partial<PatientCareRequest> = {
    id: 'req-1',
    requestCode: 'REQ-20260908-AB12',
    facilityId: 'facility-1',
    subscriptionId: 'sub-1',
    assignedUserId: 'nurse-1',
    status: CareRequestStatus.PENDING,
    title: 'Cảm thấy tức ngực sau khi uống thuốc huyết áp',
    description: 'Bắt đầu tức ngực từ 10h sáng.',
    mediaUrls: ['https://storage.vndoctor.vn/prescriptions/img-001.jpg'],
    subscription: mockActiveSubscription as PatientCareSubscription,
  };

  const mockConversation: Partial<Conversation> = {
    id: 'conv-1',
    facilityId: 'facility-1',
    subscriptionId: 'sub-1',
    type: ConversationType.CARE_TEAM,
    status: ConversationStatus.ACTIVE,
    title: 'Nhóm Chăm Sóc - Trần Thị Mai',
  };

  const mockCareRequestRepo = {
    create: jest.fn().mockImplementation((dto: Partial<PatientCareRequest>): PatientCareRequest => dto as PatientCareRequest),
    save: jest.fn().mockImplementation((entity: Partial<PatientCareRequest>): Promise<PatientCareRequest> => Promise.resolve({ id: 'req-1', ...entity } as PatientCareRequest)),
    findOne: jest.fn().mockImplementation((options: { where: Record<string, unknown> }) => {
      if (options.where.id === 'req-1') {
        return Promise.resolve({ ...mockCareRequest });
      }
      return Promise.resolve(null);
    }),
    createQueryBuilder: jest.fn().mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockCareRequest], 1]),
    }),
  };

  const mockSubscriptionRepo = {
    findOne: jest.fn().mockImplementation((options: { where: Record<string, unknown> }) => {
      if (options.where.id === 'sub-1') {
        return Promise.resolve({ ...mockActiveSubscription });
      }
      return Promise.resolve(null);
    }),
  };

  const mockFacilityRepo = {
    findOne: jest.fn().mockImplementation((options: { where: Record<string, unknown> }) => {
      if (options.where.id === 'facility-1') {
        return Promise.resolve({ ...mockFacility });
      }
      return Promise.resolve(null);
    }),
  };

  const mockStaffUserRepo = {
    findOne: jest.fn().mockImplementation((options: { where: Record<string, unknown> }) => {
      if (options.where.id === 'doc-1') return Promise.resolve({ ...mockDoctor });
      if (options.where.id === 'nurse-1') return Promise.resolve({ ...mockNurse });
      return Promise.resolve(null);
    }),
  };

  const mockConversationRepo = {
    findOne: jest.fn().mockResolvedValue({ ...mockConversation }),
    save: jest.fn().mockImplementation((dto: unknown) => Promise.resolve(dto)),
  };

  const mockMessageRepo = {
    create: jest.fn().mockImplementation((dto: unknown) => dto),
    save: jest.fn().mockImplementation((dto: { id?: string }) => Promise.resolve({ id: 'msg-1', ...dto })),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CareRequestsService,
        { provide: getRepositoryToken(PatientCareRequest), useValue: mockCareRequestRepo },
        { provide: getRepositoryToken(PatientCareSubscription), useValue: mockSubscriptionRepo },
        { provide: getRepositoryToken(Facility), useValue: mockFacilityRepo },
        { provide: getRepositoryToken(StaffUser), useValue: mockStaffUserRepo },
        { provide: getRepositoryToken(Conversation), useValue: mockConversationRepo },
        { provide: getRepositoryToken(Message), useValue: mockMessageRepo },
      ],
    }).compile();

    service = module.get<CareRequestsService>(CareRequestsService);
  });

  describe('create', () => {
    it('should create care request and sync into Care Team chat room', async () => {
      const result = await service.create(
        {
          subscriptionId: 'sub-1',
          title: 'Cảm thấy tức ngực sau khi uống thuốc huyết áp',
          description: 'Bắt đầu tức ngực từ 10h sáng.',
          mediaUrls: ['https://storage.vndoctor.vn/prescriptions/img-001.jpg'],
        },
        'account-1',
      );

      expect(result).toBeDefined();
      expect(mockCareRequestRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          subscriptionId: 'sub-1',
          assignedUserId: 'nurse-1',
          status: CareRequestStatus.PENDING,
        }),
      );
      expect(mockMessageRepo.save).toHaveBeenCalled();
      expect(mockConversationRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFound if subscription does not exist', async () => {
      await expect(
        service.create(
          { subscriptionId: 'non-existing', title: 'Tức ngực' },
          'account-1',
        ),
      ).rejects.toThrow(NotFound);
    });

    it('should throw Forbidden if patient does not own the subscription profile', async () => {
      await expect(
        service.create(
          { subscriptionId: 'sub-1', title: 'Tức ngực' },
          'wrong-account',
        ),
      ).rejects.toThrow(Forbidden);
    });

    it('should throw BadRequest if subscription is not ACTIVE', async () => {
      mockSubscriptionRepo.findOne.mockResolvedValueOnce({
        ...mockActiveSubscription,
        status: CareSubscriptionStatus.PENDING,
      });

      await expect(
        service.create(
          { subscriptionId: 'sub-1', title: 'Tức ngực' },
          'account-1',
        ),
      ).rejects.toThrow(BadRequest);
    });
  });

  describe('findAll', () => {
    it('should return paginated care requests', async () => {
      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('findById', () => {
    it('should return care request if found', async () => {
      const result = await service.findById('req-1', 'facility-1');
      expect(result).toBeDefined();
      expect(result.id).toBe('req-1');
    });

    it('should throw NotFound if not found', async () => {
      mockCareRequestRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.findById('non-existing')).rejects.toThrow(NotFound);
    });

    it('should throw Forbidden if staff belongs to another facility', async () => {
      await expect(service.findById('req-1', 'other-facility')).rejects.toThrow(Forbidden);
    });
  });

  describe('assignStaff (Escalate / Re-assign)', () => {
    it('should escalate / assign care request to doctor and notify chat room', async () => {
      const result = await service.assignStaff(
        'req-1',
        { assignedUserId: 'doc-1', note: 'Chuyển Bác sĩ kê đơn' },
        'facility-1',
      );

      expect(result).toBeDefined();
      expect(result.assignedUserId).toBe('doc-1');
      expect(result.status).toBe(CareRequestStatus.IN_PROGRESS);
      expect(mockMessageRepo.save).toHaveBeenCalled();
    });

    it('should throw BadRequest if assigning to staff from different facility', async () => {
      mockStaffUserRepo.findOne.mockResolvedValueOnce({
        ...mockDoctor,
        facilityId: 'other-facility',
      });

      await expect(
        service.assignStaff('req-1', { assignedUserId: 'doc-1' }, 'facility-1'),
      ).rejects.toThrow(BadRequest);
    });

    it('should throw BadRequest if assigning already RESOLVED request', async () => {
      mockCareRequestRepo.findOne.mockResolvedValueOnce({
        ...mockCareRequest,
        status: CareRequestStatus.RESOLVED,
      });

      await expect(
        service.assignStaff('req-1', { assignedUserId: 'doc-1' }, 'facility-1'),
      ).rejects.toThrow(BadRequest);
    });
  });

  describe('resolve', () => {
    it('should resolve request with medical note and sync conclusion to chat', async () => {
      const result = await service.resolve(
        'req-1',
        { resolutionNote: 'Tạm ngưng liều thuốc trưa, đo lại HA sau 1h.' },
        'facility-1',
        'doc-1',
      );

      expect(result).toBeDefined();
      expect(result.status).toBe(CareRequestStatus.RESOLVED);
      expect(result.resolutionNote).toBe('Tạm ngưng liều thuốc trưa, đo lại HA sau 1h.');
      expect(result.resolvedAt).toBeDefined();
      expect(mockMessageRepo.save).toHaveBeenCalled();
    });

    it('should throw BadRequest if already RESOLVED', async () => {
      mockCareRequestRepo.findOne.mockResolvedValueOnce({
        ...mockCareRequest,
        status: CareRequestStatus.RESOLVED,
      });

      await expect(
        service.resolve('req-1', { resolutionNote: 'Đã xử lý' }, 'facility-1'),
      ).rejects.toThrow(BadRequest);
    });
  });

  describe('updateStatus', () => {
    it('should update status to IN_PROGRESS or CANCELLED', async () => {
      const result = await service.updateStatus(
        'req-1',
        { status: CareRequestStatus.IN_PROGRESS },
        'facility-1',
      );

      expect(result.status).toBe(CareRequestStatus.IN_PROGRESS);
    });

    it('should throw BadRequest if updating already RESOLVED request', async () => {
      mockCareRequestRepo.findOne.mockResolvedValueOnce({
        ...mockCareRequest,
        status: CareRequestStatus.RESOLVED,
      });

      await expect(
        service.updateStatus(
          'req-1',
          { status: CareRequestStatus.CANCELLED },
          'facility-1',
        ),
      ).rejects.toThrow(BadRequest);
    });
  });
});
