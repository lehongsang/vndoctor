import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TreatmentTargetsService } from './treatment-targets.service';
import { PatientTreatmentTarget } from './entities/patient-treatment-target.entity';
import { HealthProfile } from '@/modules/health-profiles/entities/health-profile.entity';
import { TreatmentTargetDictionary } from '@/modules/treatment-dictionaries/entities/treatment-target-dictionary.entity';
import { PatientTargetStatus } from '@/commons/enums/vndoctor.enum';
import { Forbidden, NotFound } from '@/commons/exceptions';

describe('TreatmentTargetsService', () => {
  let service: TreatmentTargetsService;

  const mockProfile: Partial<HealthProfile> = {
    id: 'profile-1',
    accountId: 'account-1',
  };

  const mockDictionary: Partial<TreatmentTargetDictionary> = {
    code: 'A1',
    bpTarget: '< 130/80 mmHg',
    lipidTarget: '< 2.6 mmol/L',
  };

  const mockTarget: Partial<PatientTreatmentTarget> = {
    id: 'target-1',
    healthProfileId: 'profile-1',
    doctorId: 'doctor-1',
    bpTarget: '< 130/80 mmHg',
    status: PatientTargetStatus.DRAFT,
    healthProfile: mockProfile as HealthProfile,
  };

  const mockTargetRepo = {
    create: jest.fn().mockImplementation((dto: Partial<PatientTreatmentTarget>): PatientTreatmentTarget => dto as PatientTreatmentTarget),
    save: jest.fn().mockImplementation((entity: Partial<PatientTreatmentTarget>): Promise<PatientTreatmentTarget> => Promise.resolve({ id: 'target-1', ...entity } as PatientTreatmentTarget)),
    findOne: jest.fn().mockImplementation(({ where }) => {
      if (where.id === 'target-1') return Promise.resolve({ ...mockTarget });
      return Promise.resolve(null);
    }),
    createQueryBuilder: jest.fn().mockReturnValue({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockTarget], 1]),
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
      ],
    }).compile();

    service = module.get<TreatmentTargetsService>(TreatmentTargetsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create target with dictionary defaults', async () => {
      const result = await service.create(
        {
          healthProfileId: 'profile-1',
          dictionaryCode: 'A1',
        },
        'doctor-1',
      );

      expect(result.status).toBe(PatientTargetStatus.DOCTOR_VERIFIED);
      expect(result.bpTarget).toBe('< 130/80 mmHg');
    });

    it('should throw NotFound if profile does not exist', async () => {
      await expect(
        service.create({ healthProfileId: 'non-existent' }),
      ).rejects.toThrow(NotFound);
    });

    it('should throw Forbidden if account does not own profile', async () => {
      await expect(
        service.create({ healthProfileId: 'profile-1' }, undefined, 'wrong-account'),
      ).rejects.toThrow(Forbidden);
    });
  });

  describe('verify', () => {
    it('should verify and update target by doctor', async () => {
      const result = await service.verify(
        'target-1',
        { bpTarget: '< 120/80 mmHg', doctorNotes: 'Strict target' },
        'doctor-1',
      );

      expect(result.status).toBe(PatientTargetStatus.DOCTOR_VERIFIED);
      expect(result.bpTarget).toBe('< 120/80 mmHg');
      expect(result.doctorId).toBe('doctor-1');
    });

    it('should throw NotFound if target does not exist', async () => {
      await expect(
        service.verify('non-existent', {}, 'doctor-1'),
      ).rejects.toThrow(NotFound);
    });
  });

  describe('findAll', () => {
    it('should return paginated targets', async () => {
      const result = await service.findAll({ healthProfileId: 'profile-1' });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });
});
