import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TreatmentTargetsService } from './treatment-targets.service';
import { PatientTreatmentTarget } from './entities/patient-treatment-target.entity';
import { HealthProfile } from '@/modules/health-profiles/entities/health-profile.entity';
import { TreatmentTargetDictionary } from '@/modules/treatment-dictionaries/entities/treatment-target-dictionary.entity';
import { PatientCareSubscription } from '@/modules/care-subscriptions/entities/care-subscription.entity';
import { CareSubscriptionStatus, PatientTargetStatus, VnDoctorRiskLevel } from '@/commons/enums/vndoctor.enum';
import { Forbidden, NotFound } from '@/commons/exceptions';
import type { StaffJwtPayload } from '@/commons/decorators/current-staff.decorator';

describe('TreatmentTargetsService', () => {
  let service: TreatmentTargetsService;

  const mockStaff: StaffJwtPayload = {
    id: 'doctor-1',
    role: 'DOCTOR' as unknown as StaffJwtPayload['role'],
    facilityId: 'fac-1',
  } as StaffJwtPayload;

  const mockProfile: Partial<HealthProfile> = {
    id: 'profile-1',
    accountId: 'account-1',
  };

  const mockDictionary: Partial<TreatmentTargetDictionary> = {
    code: 'A1',
    bpTarget: '< 130/80 mmHg',
    lipidTarget: '< 2.6 mmol/L',
    bmiTarget: '18.5 - 22.9 kg/m2',
    glycemicTarget: '< 7.0%',
    renalTarget: 'eGFR > 60',
    dietAdvice: 'Eat more vegetables',
    exerciseAdvice: 'Walk 30 mins a day',
    smokingAdvice: 'Stop smoking',
  };

  const mockSubscription: Partial<PatientCareSubscription> = {
    id: 'sub-1',
    healthProfileId: 'profile-1',
    status: CareSubscriptionStatus.ACTIVE,
    assignedDoctorId: 'doctor-1',
    assignedExpertId: 'expert-1',
  };

  const mockTarget: Partial<PatientTreatmentTarget> = {
    id: 'target-1',
    healthProfileId: 'profile-1',
    careSubscriptionId: 'sub-1',
    doctorId: 'doctor-1',
    expertId: null,
    bpTarget: '< 130/80 mmHg',
    status: PatientTargetStatus.PENDING_REVIEW,
    healthProfile: mockProfile as HealthProfile,
    careSubscription: mockSubscription as PatientCareSubscription,
  };

  const mockTargetRepo = {
    create: jest.fn().mockImplementation((dto: Partial<PatientTreatmentTarget>): PatientTreatmentTarget => dto as PatientTreatmentTarget),
    save: jest.fn().mockImplementation((entity: Partial<PatientTreatmentTarget>): Promise<PatientTreatmentTarget> => Promise.resolve({ id: 'target-1', ...entity } as PatientTreatmentTarget)),
    findOne: jest.fn().mockImplementation(({ where }) => {
      if (where.id === 'target-1') return Promise.resolve({ ...mockTarget });
      return Promise.resolve(null);
    }),
    softRemove: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
    createQueryBuilder: jest.fn().mockReturnValue({
      innerJoinAndSelect: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockTarget], 1]),
      getOne: jest.fn().mockResolvedValue(mockTarget),
    }),
  };

  const mockProfileRepo = {
    findOne: jest.fn().mockImplementation(({ where }) => {
      if (where.id === 'profile-1') return Promise.resolve(mockProfile);
      return Promise.resolve(null);
    }),
  };

  const mockDictRepo = {
    findOne: jest.fn().mockImplementation(({ where }) => {
      if (where.code === 'A1') return Promise.resolve(mockDictionary);
      return Promise.resolve(null);
    }),
  };

  const mockSubRepo = {
    findOne: jest.fn().mockImplementation(({ where }) => {
      if (where.healthProfileId === 'profile-1' && where.status === CareSubscriptionStatus.ACTIVE) {
        return Promise.resolve(mockSubscription);
      }
      return Promise.resolve(null);
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TreatmentTargetsService,
        {
          provide: getRepositoryToken(PatientTreatmentTarget),
          useValue: mockTargetRepo,
        },
        {
          provide: getRepositoryToken(HealthProfile),
          useValue: mockProfileRepo,
        },
        {
          provide: getRepositoryToken(TreatmentTargetDictionary),
          useValue: mockDictRepo,
        },
        {
          provide: getRepositoryToken(PatientCareSubscription),
          useValue: mockSubRepo,
        },
      ],
    }).compile();

    service = module.get<TreatmentTargetsService>(TreatmentTargetsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateFromRiskAssessment', () => {
    it('should generate target with dictionary defaults when active subscription exists', async () => {
      const result = await service.generateFromRiskAssessment({
        healthProfileId: 'profile-1',
        assessmentResultId: 'assessment-res-1',
        riskLevel: VnDoctorRiskLevel.LOW,
        age: 45,
      });

      expect(result).toBeDefined();
      expect(result?.status).toBe(PatientTargetStatus.PENDING_REVIEW);
      expect(result?.careSubscriptionId).toBe('sub-1');
      expect(result?.doctorId).toBe('doctor-1');
      expect(result?.bpTarget).toBe('< 130/80 mmHg');
    });

    it('should return null if profile has no active subscription', async () => {
      const result = await service.generateFromRiskAssessment({
        healthProfileId: 'profile-no-sub',
        assessmentResultId: 'assessment-res-1',
        riskLevel: VnDoctorRiskLevel.LOW,
        age: 45,
      });

      expect(result).toBeNull();
    });
  });

  describe('findAllForPatient', () => {
    it('should return targets for patient when owned profile', async () => {
      const result = await service.findAllForPatient(
        { healthProfileId: 'profile-1' },
        'account-1',
      );

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('should throw Forbidden if patient does not own the profile', async () => {
      await expect(
        service.findAllForPatient({ healthProfileId: 'profile-1' }, 'wrong-account'),
      ).rejects.toThrow(Forbidden);
    });
  });

  describe('update', () => {
    it('should allow staff to update target fields', async () => {
      const result = await service.update(
        'target-1',
        { bpTarget: '< 120/80 mmHg', doctorNotes: 'Adjusted by doctor' },
        mockStaff,
      );

      expect(result).toBeDefined();
      expect(result.bpTarget).toBe('< 120/80 mmHg');
      expect(result.doctorNotes).toBe('Adjusted by doctor');
    });

    it('should throw NotFound if target does not exist', async () => {
      await expect(
        service.update('non-existent', { bpTarget: '< 120/80' }, mockStaff),
      ).rejects.toThrow(NotFound);
    });
  });

  describe('verify', () => {
    it('should verify target by doctor or expert', async () => {
      const result = await service.verify(
        'target-1',
        { bpTarget: '< 120/80 mmHg', doctorNotes: 'Strict target' },
        mockStaff,
      );

      expect(result.status).toBe(PatientTargetStatus.DOCTOR_VERIFIED);
      expect(result.bpTarget).toBe('< 120/80 mmHg');
    });
  });

  describe('escalateToExpert', () => {
    it('should escalate target to expert doctor', async () => {
      const result = await service.escalateToExpert(
        'target-1',
        { doctorNotes: 'Complex comorbidity needs cardiology specialist consultation' },
        mockStaff,
      );

      expect(result.status).toBe(PatientTargetStatus.ESCALATED_TO_EXPERT);
      expect(result.expertId).toBe('expert-1');
    });
  });

  describe('findByAssessmentId', () => {
    it('should return target by assessment ID for staff', async () => {
      const result = await service.findByAssessmentId('assessment-1');
      expect(result).toBeDefined();
      expect(result.id).toBe('target-1');
    });

    it('should return target by assessment ID for patient when owned and active sub', async () => {
      const result = await service.findByAssessmentId('assessment-1', 'account-1');
      expect(result).toBeDefined();
      expect(result.id).toBe('target-1');
    });

    it('should throw Forbidden if patient does not own the target profile', async () => {
      await expect(
        service.findByAssessmentId('assessment-1', 'wrong-account'),
      ).rejects.toThrow(Forbidden);
    });
  });
});
