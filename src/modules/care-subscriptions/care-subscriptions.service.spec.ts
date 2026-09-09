import {
  CarePackageStatus,
  CarePackageType,
  CareSubscriptionStatus,
  StaffRole,
} from '@/commons/enums/vndoctor.enum';
import { BadRequest, Conflict, Forbidden, NotFound } from '@/commons/exceptions';
import { CarePackage } from '@/modules/care-packages/entities/care-package.entity';
import { HealthProfile } from '@/modules/health-profiles/entities/health-profile.entity';
import { StaffUser } from '@/modules/staff/entities/staff-user.entity';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CareSubscriptionsService } from './care-subscriptions.service';
import { PatientCareSubscription } from './entities/care-subscription.entity';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';

describe('CareSubscriptionsService', () => {
  let service: CareSubscriptionsService;

  const mockHealthProfile: Partial<HealthProfile> = {
    id: 'profile-1',
    accountId: 'account-1',
    fullName: 'Trần Thị Mai',
  };

  const mockCarePackage: Partial<CarePackage> = {
    id: 'pkg-1',
    facilityId: 'facility-1',
    code: 'PKG-CARDIO-30D',
    name: 'Gói Chăm Sóc Tim Mạch 30 Ngày',
    type: CarePackageType.STANDARD,
    durationDays: 30,
    priceAmount: 1500000,
    status: CarePackageStatus.ACTIVE,
  };

  const mockVipCarePackage: Partial<CarePackage> = {
    id: 'pkg-vip',
    facilityId: 'facility-1',
    code: 'PKG-CARDIO-VIP-90D',
    name: 'Gói VIP Chăm Sóc Tim Mạch 90 Ngày',
    type: CarePackageType.VIP,
    durationDays: 90,
    priceAmount: 5000000,
    status: CarePackageStatus.ACTIVE,
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

  const mockExpert: Partial<StaffUser> = {
    id: 'expert-1',
    facilityId: 'facility-1',
    fullName: 'PGS. TS. Trần Đức Cường',
    role: StaffRole.DOCTOR,
    isActive: true,
  };

  const mockSubscription: Partial<PatientCareSubscription> = {
    id: 'sub-1',
    healthProfileId: 'profile-1',
    carePackageId: 'pkg-1',
    status: CareSubscriptionStatus.PENDING,
    startedAt: null,
    expiresAt: null,
    assignedDoctorId: null,
    assignedNurseId: null,
    assignedExpertId: null,
    carePackage: mockCarePackage as CarePackage,
    healthProfile: mockHealthProfile as HealthProfile,
  };

  const mockSubscriptionRepo = {
    create: jest.fn().mockImplementation((dto: Partial<PatientCareSubscription>): PatientCareSubscription => dto as PatientCareSubscription),
    save: jest.fn().mockImplementation((entity: Partial<PatientCareSubscription> | Partial<PatientCareSubscription>[]): Promise<unknown> => {
      if (Array.isArray(entity)) {
        return Promise.resolve(entity);
      }
      return Promise.resolve({ id: 'sub-1', ...entity });
    }),
    findOne: jest.fn().mockImplementation((options: { where: Record<string, unknown> }) => {
      if (options.where.id === 'sub-1') {
        return Promise.resolve({ ...mockSubscription });
      }
      return Promise.resolve(null);
    }),
    find: jest.fn().mockResolvedValue([]),
    createQueryBuilder: jest.fn().mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockSubscription], 1]),
    }),
  };

  const mockCarePackageRepo = {
    findOne: jest.fn().mockImplementation((options: { where: Record<string, unknown> }) => {
      if (options.where.id === 'pkg-1') {
        return Promise.resolve({ ...mockCarePackage });
      }
      if (options.where.id === 'pkg-vip') {
        return Promise.resolve({ ...mockVipCarePackage });
      }
      return Promise.resolve(null);
    }),
  };

  const mockHealthProfileRepo = {
    findOne: jest.fn().mockImplementation((options: { where: Record<string, unknown> }) => {
      if (options.where.id === 'profile-1') {
        return Promise.resolve({ ...mockHealthProfile });
      }
      return Promise.resolve(null);
    }),
  };

  const mockStaffUserRepo = {
    findOne: jest.fn().mockImplementation((options: { where: Record<string, unknown> }) => {
      if (options.where.id === 'doc-1') {
        return Promise.resolve({ ...mockDoctor });
      }
      if (options.where.id === 'nurse-1') {
        return Promise.resolve({ ...mockNurse });
      }
      if (options.where.id === 'expert-1') {
        return Promise.resolve({ ...mockExpert });
      }
      return Promise.resolve(null);
    }),
  };

  const mockConversationRepo = {
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockImplementation((dto: unknown) => dto),
    save: jest.fn().mockImplementation((dto: { id?: string }) => Promise.resolve({ id: 'conv-1', ...dto })),
  };

  const mockMessageRepo = {
    create: jest.fn().mockImplementation((dto: unknown) => dto),
    save: jest.fn().mockImplementation((dto: { id?: string }) => Promise.resolve({ id: 'msg-1', ...dto })),
  };

  const mockDataSource = {
    transaction: jest.fn().mockImplementation((cb: (manager: unknown) => unknown) => {
      const mockManager = {
        findOne: jest.fn().mockImplementation((entityClass: unknown, options: { where: Record<string, unknown> }) => {
          if (entityClass === PatientCareSubscription) {
            if (options.where.id === 'sub-1') {
              return Promise.resolve({ ...mockSubscription, carePackage: { ...mockCarePackage }, healthProfile: { ...mockHealthProfile } });
            }
            if (options.where.id === 'sub-vip') {
              return Promise.resolve({
                ...mockSubscription,
                id: 'sub-vip',
                carePackageId: 'pkg-vip',
                carePackage: { ...mockVipCarePackage },
                healthProfile: { ...mockHealthProfile },
              });
            }
          }
          if (entityClass === StaffUser) {
            if (options.where.id === 'doc-1') return Promise.resolve({ ...mockDoctor });
            if (options.where.id === 'nurse-1') return Promise.resolve({ ...mockNurse });
            if (options.where.id === 'expert-1') return Promise.resolve({ ...mockExpert });
          }
          if (entityClass === Conversation) {
            return Promise.resolve(null);
          }
          return Promise.resolve(null);
        }),
        create: jest.fn().mockImplementation((entityClass: unknown, data: Record<string, unknown>) => ({ ...data })),
        save: jest.fn().mockImplementation((entityClassOrData: unknown, data?: unknown) => {
          const payload = data || entityClassOrData;
          return Promise.resolve({ id: 'tx-id-1', ...(payload as object) });
        }),
      };
      return cb(mockManager);
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CareSubscriptionsService,
        { provide: getRepositoryToken(PatientCareSubscription), useValue: mockSubscriptionRepo },
        { provide: getRepositoryToken(CarePackage), useValue: mockCarePackageRepo },
        { provide: getRepositoryToken(HealthProfile), useValue: mockHealthProfileRepo },
        { provide: getRepositoryToken(StaffUser), useValue: mockStaffUserRepo },
        { provide: getRepositoryToken(Conversation), useValue: mockConversationRepo },
        { provide: getRepositoryToken(Message), useValue: mockMessageRepo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<CareSubscriptionsService>(CareSubscriptionsService);
  });

  describe('create', () => {
    it('should create a subscription in PENDING status', async () => {
      const result = await service.create(
        { healthProfileId: 'profile-1', carePackageId: 'pkg-1' },
        'account-1',
      );

      expect(result).toBeDefined();
      expect(mockSubscriptionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          healthProfileId: 'profile-1',
          carePackageId: 'pkg-1',
          status: CareSubscriptionStatus.PENDING,
          startedAt: null,
          expiresAt: null,
        }),
      );
    });

    it('should throw NotFound when health profile is missing', async () => {
      await expect(
        service.create({ healthProfileId: 'invalid-id', carePackageId: 'pkg-1' }),
      ).rejects.toThrow(NotFound);
    });

    it('should throw Forbidden when account does not own the health profile', async () => {
      await expect(
        service.create(
          { healthProfileId: 'profile-1', carePackageId: 'pkg-1' },
          'wrong-account',
        ),
      ).rejects.toThrow(Forbidden);
    });

    it('should throw NotFound when care package does not exist', async () => {
      await expect(
        service.create(
          { healthProfileId: 'profile-1', carePackageId: 'invalid-pkg' },
          'account-1',
        ),
      ).rejects.toThrow(NotFound);
    });

    it('should throw BadRequest when care package is INACTIVE', async () => {
      mockCarePackageRepo.findOne.mockResolvedValueOnce({
        ...mockCarePackage,
        status: CarePackageStatus.INACTIVE,
      });

      await expect(
        service.create(
          { healthProfileId: 'profile-1', carePackageId: 'pkg-1' },
          'account-1',
        ),
      ).rejects.toThrow(BadRequest);
    });

    it('should throw Conflict when an active subscription already exists', async () => {
      mockSubscriptionRepo.findOne.mockResolvedValueOnce({
        ...mockSubscription,
        status: CareSubscriptionStatus.ACTIVE,
      });

      await expect(
        service.create(
          { healthProfileId: 'profile-1', carePackageId: 'pkg-1' },
          'account-1',
        ),
      ).rejects.toThrow(Conflict);
    });
  });

  describe('findAll', () => {
    it('should return paginated subscriptions', async () => {
      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('findById', () => {
    it('should return subscription if found', async () => {
      const result = await service.findById('sub-1', 'facility-1');
      expect(result).toBeDefined();
      expect(result.id).toBe('sub-1');
    });

    it('should throw NotFound if not found', async () => {
      mockSubscriptionRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.findById('non-existing')).rejects.toThrow(NotFound);
    });

    it('should throw Forbidden if staff from different facility accesses it', async () => {
      await expect(service.findById('sub-1', 'diff-facility')).rejects.toThrow(Forbidden);
    });

    it('should throw Forbidden if patient does not own the profile', async () => {
      await expect(service.findById('sub-1', undefined, 'diff-account')).rejects.toThrow(Forbidden);
    });
  });

  describe('assignAndActivate', () => {
    it('should assign care team, activate subscription, and initialize conversation and welcome message', async () => {
      const result = await service.assignAndActivate(
        'sub-1',
        { assignedDoctorId: 'doc-1', assignedNurseId: 'nurse-1' },
        'facility-1',
      );

      expect(result).toBeDefined();
      expect(mockDataSource.transaction).toHaveBeenCalled();
    });

    it('should throw BadRequest for VIP package when assignedExpertId is missing', async () => {
      await expect(
        service.assignAndActivate(
          'sub-vip',
          { assignedDoctorId: 'doc-1', assignedNurseId: 'nurse-1' },
          'facility-1',
        ),
      ).rejects.toThrow(BadRequest);
    });

    it('should assign VIP package successfully when assignedExpertId is provided', async () => {
      const result = await service.assignAndActivate(
        'sub-vip',
        { assignedDoctorId: 'doc-1', assignedNurseId: 'nurse-1', assignedExpertId: 'expert-1' },
        'facility-1',
      );

      expect(result).toBeDefined();
    });
  });

  describe('updateCareTeam', () => {
    it('should update doctor and nurse for an active subscription', async () => {
      mockSubscriptionRepo.findOne.mockResolvedValueOnce({
        ...mockSubscription,
        status: CareSubscriptionStatus.ACTIVE,
      });

      const result = await service.updateCareTeam(
        'sub-1',
        { assignedDoctorId: 'doc-1', assignedNurseId: 'nurse-1' },
        'facility-1',
      );

      expect(result).toBeDefined();
    });

    it('should throw BadRequest when changing team for CANCELLED subscription', async () => {
      mockSubscriptionRepo.findOne.mockResolvedValueOnce({
        ...mockSubscription,
        status: CareSubscriptionStatus.CANCELLED,
      });

      await expect(
        service.updateCareTeam('sub-1', { assignedDoctorId: 'doc-1' }, 'facility-1'),
      ).rejects.toThrow(BadRequest);
    });
  });

  describe('cancel', () => {
    it('should cancel subscription', async () => {
      const result = await service.cancel('sub-1', 'facility-1');
      expect(result.status).toBe(CareSubscriptionStatus.CANCELLED);
    });

    it('should throw BadRequest if subscription already cancelled', async () => {
      mockSubscriptionRepo.findOne.mockResolvedValueOnce({
        ...mockSubscription,
        status: CareSubscriptionStatus.CANCELLED,
      });

      await expect(service.cancel('sub-1', 'facility-1')).rejects.toThrow(BadRequest);
    });
  });

  describe('expireSubscriptionsJob', () => {
    it('should mark overdue subscriptions as EXPIRED', async () => {
      mockSubscriptionRepo.find.mockResolvedValueOnce([
        { id: 'sub-expired-1', status: CareSubscriptionStatus.ACTIVE, expiresAt: new Date(Date.now() - 10000) },
      ]);

      const count = await service.expireSubscriptionsJob();
      expect(count).toBe(1);
    });

    it('should return 0 when no subscriptions are overdue', async () => {
      mockSubscriptionRepo.find.mockResolvedValueOnce([]);
      const count = await service.expireSubscriptionsJob();
      expect(count).toBe(0);
    });
  });
});
