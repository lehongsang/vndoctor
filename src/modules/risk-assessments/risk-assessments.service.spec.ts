import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { RiskAssessmentsService } from './risk-assessments.service';
import { RiskFactorAssessmentInput } from './entities/risk-factor-assessment-input.entity';
import { RiskFactorAssessmentResult } from './entities/risk-factor-assessment-result.entity';
import { HealthProfile } from '@/modules/health-profiles/entities/health-profile.entity';
import { Facility } from '@/modules/facilities/entities/facility.entity';
import { AssessmentStatus, VnDoctorRiskLevel } from '@/commons/enums/vndoctor.enum';
import { NotFound } from '@/commons/exceptions';

describe('RiskAssessmentsService', () => {
  let service: RiskAssessmentsService;
  let inputRepo: jest.Mocked<Repository<RiskFactorAssessmentInput>>;
  let resultRepo: jest.Mocked<Repository<RiskFactorAssessmentResult>>;
  let profileRepo: jest.Mocked<Repository<HealthProfile>>;

  const mockProfile: HealthProfile = {
    id: 'profile-uuid-1',
    accountId: 'acc-uuid-1',
    fullName: 'Le Van B',
    gender: 'MALE' as any,
    dateOfBirth: '1980-05-15',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  } as unknown as HealthProfile;

  const mockResult: RiskFactorAssessmentResult = {
    id: 'result-uuid-1',
    assessmentInputId: 'input-uuid-1',
    riskScore: 8.0,
    riskLevel: VnDoctorRiskLevel.HIGH,
    conclusion: 'High risk',
    recommendations: 'Diet and medication',
    evaluatedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  } as unknown as RiskFactorAssessmentResult;

  const mockInput: RiskFactorAssessmentInput = {
    id: 'input-uuid-1',
    healthProfileId: 'profile-uuid-1',
    facilityId: 'fac-uuid-1',
    hasUnderlyingDisease: true,
    chronicDiseaseIds: [],
    hasLeftVentricularHypertrophy: false,
    hasAlbuminuria: false,
    hasRetinopathy: false,
    hasSilentBrainInfarct: false,
    egfr: 80,
    acr: 15,
    heightCm: 170,
    weightKg: 70,
    bmi: 24.22,
    systolicBp: 130,
    diastolicBp: 80,
    isSmoking: true,
    totalCholesterol: 5.2,
    hdlCholesterol: 1.2,
    ldlCholesterol: 3.1,
    triglycerides: 1.8,
    glucoseFasting: 5.5,
    status: AssessmentStatus.SUBMITTED,
    assessmentDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    assessmentResult: mockResult,
  } as unknown as RiskFactorAssessmentInput;

  beforeEach(async () => {
    const mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockResult], 1]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RiskAssessmentsService,
        {
          provide: getRepositoryToken(RiskFactorAssessmentInput),
          useValue: {
            create: jest.fn().mockImplementation((dto: Partial<RiskFactorAssessmentInput>) => ({ id: 'new-input-id', ...dto } as RiskFactorAssessmentInput)),
            save: jest.fn().mockImplementation((inp: RiskFactorAssessmentInput) => Promise.resolve(inp)),
            findOne: jest.fn().mockResolvedValue(mockInput),
          },
        },
        {
          provide: getRepositoryToken(RiskFactorAssessmentResult),
          useValue: {
            create: jest.fn().mockImplementation((dto: Partial<RiskFactorAssessmentResult>) => ({ id: 'new-result-id', ...dto } as RiskFactorAssessmentResult)),
            save: jest.fn().mockImplementation((res: RiskFactorAssessmentResult) => Promise.resolve(res)),
            findOne: jest.fn().mockResolvedValue(mockResult),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(HealthProfile),
          useValue: {
            findOne: jest.fn().mockResolvedValue(mockProfile),
          },
        },
        {
          provide: getRepositoryToken(Facility),
          useValue: {
            findOne: jest.fn().mockResolvedValue({ id: 'fac-uuid-1', name: 'BV Bach Mai' }),
          },
        },
      ],
    }).compile();

    service = module.get<RiskAssessmentsService>(RiskAssessmentsService);
    inputRepo = module.get(getRepositoryToken(RiskFactorAssessmentInput));
    resultRepo = module.get(getRepositoryToken(RiskFactorAssessmentResult));
    profileRepo = module.get(getRepositoryToken(HealthProfile));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateRedFlags', () => {
    it('should detect hypertension and smoking red flags', () => {
      const result = service.calculateRedFlags({
        systolicBp: 165,
        diastolicBp: 95,
        isSmoking: true,
        bmi: 26.5,
      });

      expect(result.hasWarningAlert).toBe(true);
      expect(result.redFlags.length).toBeGreaterThanOrEqual(2);
      expect(result.redFlags.some((rf) => rf.metric === 'BLOOD_PRESSURE')).toBe(true);
      expect(result.redFlags.some((rf) => rf.metric === 'SMOKING')).toBe(true);
    });

    it('should return no red flags for normal parameters', () => {
      const result = service.calculateRedFlags({
        systolicBp: 120,
        diastolicBp: 80,
        isSmoking: false,
        bmi: 22.0,
      });

      expect(result.hasWarningAlert).toBe(false);
      expect(result.redFlags).toHaveLength(0);
    });
  });

  describe('create', () => {
    it('should create assessment input and return initial result', async () => {
      const result = await service.create(
        {
          healthProfileId: 'profile-uuid-1',
          facilityId: 'fac-uuid-1',
          heightCm: 170,
          weightKg: 68,
          systolicBp: 130,
          isSmoking: true,
        },
        'acc-uuid-1',
      );

      expect(profileRepo.findOne).toHaveBeenCalledWith({ where: { id: 'profile-uuid-1' } });
      expect(inputRepo.create).toHaveBeenCalled();
      expect(inputRepo.save).toHaveBeenCalled();
      expect(resultRepo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.riskLevel).toEqual(VnDoctorRiskLevel.HIGH);
    });
  });

  describe('evaluate', () => {
    it('should update result and set status to EVALUATED', async () => {
      const result = await service.evaluate(
        'input-uuid-1',
        {
          riskLevel: VnDoctorRiskLevel.HIGH,
          riskScore: 9.0,
          conclusion: 'High risk confirmed',
          recommendations: 'Diet and medication',
        },
        'doctor-staff-id-1',
      );

      expect(inputRepo.findOne).toHaveBeenCalled();
      expect(resultRepo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should throw NotFound if input not found', async () => {
      inputRepo.findOne.mockResolvedValueOnce(null);
      await expect(
        service.evaluate('invalid-id', { riskLevel: VnDoctorRiskLevel.LOW }, 'doc-1'),
      ).rejects.toThrow(NotFound);
    });
  });

  describe('findAll', () => {
    it('should return paginated assessment results', async () => {
      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.total).toEqual(1);
    });
  });

  describe('findOne', () => {
    it('should return assessment result by input id', async () => {
      const result = await service.findOne('input-uuid-1', 'acc-uuid-1');
      expect(result.id).toEqual('result-uuid-1');
    });
  });
});
