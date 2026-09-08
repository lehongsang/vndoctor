import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TreatmentPlansService } from './treatment-plans.service';
import { TreatmentPlan } from './entities/treatment-plan.entity';
import { TreatmentTemplate } from './entities/treatment-template.entity';
import { HealthProfile } from '@/modules/health-profiles/entities/health-profile.entity';
import { Facility } from '@/modules/facilities/entities/facility.entity';
import { PatientTreatmentTarget } from '@/modules/treatment-targets/entities/patient-treatment-target.entity';
import { VnDoctorPlanStatus } from '@/commons/enums/vndoctor.enum';
import { NotFound, Forbidden } from '@/commons/exceptions';

describe('TreatmentPlansService', () => {
  let service: TreatmentPlansService;

  const mockProfile: Partial<HealthProfile> = {
    id: 'profile-1',
    accountId: 'account-1',
  };

  const mockFacility: Partial<Facility> = {
    id: 'facility-1',
    facilityName: 'Bệnh viện Đa khoa',
  };

  const mockTemplate: Partial<TreatmentTemplate> = {
    id: 'tmpl-1',
    facilityId: 'facility-1',
    templateName: 'Phác đồ chuẩn THA',
    content: 'Hướng dẫn điều trị...',
    isActive: true,
  };

  const mockPlan: Partial<TreatmentPlan> = {
    id: 'plan-1',
    planCode: 'TP-2026-00001',
    healthProfileId: 'profile-1',
    doctorId: 'doctor-1',
    title: 'Phác đồ THA 3 tháng',
    status: VnDoctorPlanStatus.ACTIVE,
    healthProfile: mockProfile as HealthProfile,
  };

  const mockPlanRepo = {
    count: jest.fn().mockResolvedValue(0),
    create: jest.fn().mockImplementation((dto: Partial<TreatmentPlan>): TreatmentPlan => dto as TreatmentPlan),
    save: jest.fn().mockImplementation((entity: Partial<TreatmentPlan>): Promise<TreatmentPlan> => Promise.resolve({ id: 'plan-1', ...entity } as TreatmentPlan)),
    findOne: jest.fn().mockImplementation(({ where }) => {
      if (where.id === 'plan-1') return Promise.resolve({ ...mockPlan });
      return Promise.resolve(null);
    }),
    createQueryBuilder: jest.fn().mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockPlan], 1]),
    }),
  };

  const mockTemplateRepo = {
    create: jest.fn().mockImplementation((dto: Partial<TreatmentTemplate>): TreatmentTemplate => dto as TreatmentTemplate),
    save: jest.fn().mockImplementation((entity: Partial<TreatmentTemplate>): Promise<TreatmentTemplate> => Promise.resolve({ id: 'tmpl-1', ...entity } as TreatmentTemplate)),
    findOne: jest.fn().mockImplementation(({ where }) => {
      if (where.id === 'tmpl-1') return Promise.resolve({ ...mockTemplate });
      return Promise.resolve(null);
    }),
    createQueryBuilder: jest.fn().mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockTemplate], 1]),
    }),
  };

  const mockProfileRepo = {
    findOne: jest.fn().mockImplementation(({ where }) => {
      if (where.id === 'profile-1') return Promise.resolve(mockProfile);
      return Promise.resolve(null);
    }),
  };

  const mockFacilityRepo = {
    findOne: jest.fn().mockImplementation(({ where }) => {
      if (where.id === 'facility-1') return Promise.resolve(mockFacility);
      return Promise.resolve(null);
    }),
  };

  const mockTargetRepo = {
    findOne: jest.fn().mockResolvedValue({ id: 'target-1' }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TreatmentPlansService,
        {
          provide: getRepositoryToken(TreatmentPlan),
          useValue: mockPlanRepo,
        },
        {
          provide: getRepositoryToken(TreatmentTemplate),
          useValue: mockTemplateRepo,
        },
        {
          provide: getRepositoryToken(HealthProfile),
          useValue: mockProfileRepo,
        },
        {
          provide: getRepositoryToken(Facility),
          useValue: mockFacilityRepo,
        },
        {
          provide: getRepositoryToken(PatientTreatmentTarget),
          useValue: mockTargetRepo,
        },
      ],
    }).compile();

    service = module.get<TreatmentPlansService>(TreatmentPlansService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTemplate', () => {
    it('should create template successfully', async () => {
      const result = await service.createTemplate(
        {
          templateName: 'Phác đồ chuẩn THA',
          content: 'Hướng dẫn điều trị...',
        },
        'facility-1',
      );
      expect(result.templateName).toBe('Phác đồ chuẩn THA');
    });

    it('should throw NotFound if facility does not exist', async () => {
      await expect(
        service.createTemplate(
          { templateName: 'Tmpl', content: 'Cont' },
          'non-existent',
        ),
      ).rejects.toThrow(NotFound);
    });
  });

  describe('createPlan', () => {
    it('should create plan with generated planCode', async () => {
      const result = await service.createPlan(
        {
          healthProfileId: 'profile-1',
          title: 'Phác đồ THA 3 tháng',
        },
        'doctor-1',
      );

      expect(result.planCode).toContain('TP-');
      expect(result.doctorId).toBe('doctor-1');
      expect(result.status).toBe(VnDoctorPlanStatus.ACTIVE);
    });

    it('should throw NotFound if health profile does not exist', async () => {
      await expect(
        service.createPlan(
          { healthProfileId: 'non-existent', title: 'T' },
          'doctor-1',
        ),
      ).rejects.toThrow(NotFound);
    });
  });

  describe('updatePlan', () => {
    it('should update plan', async () => {
      const result = await service.updatePlan('plan-1', {
        title: 'Phác đồ đã cập nhật',
      });
      expect(result.title).toBe('Phác đồ đã cập nhật');
    });

    it('should throw Forbidden if account does not own profile', async () => {
      await expect(
        service.updatePlan('plan-1', {}, undefined, 'wrong-account'),
      ).rejects.toThrow(Forbidden);
    });
  });
});
