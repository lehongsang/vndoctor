import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { RiskAssessmentsService } from './risk-assessments.service';
import { RiskFactorAssessmentInput } from './entities/risk-factor-assessment-input.entity';
import { RiskFactorAssessmentResult } from './entities/risk-factor-assessment-result.entity';
import { HealthProfile } from '@/modules/health-profiles/entities/health-profile.entity';
import { Facility } from '@/modules/facilities/entities/facility.entity';
import { AssessmentStatus, ProfileGender, VnDoctorRiskLevel } from '@/commons/enums/vndoctor.enum';
import { NotFound } from '@/commons/exceptions';
import { TreatmentTargetsService } from '@/modules/treatment-targets/treatment-targets.service';
import { RiskDictionaryService } from './services/risk-dictionary.service';

describe('RiskAssessmentsService', () => {
  let service: RiskAssessmentsService;
  let inputRepo: jest.Mocked<Repository<RiskFactorAssessmentInput>>;
  let resultRepo: jest.Mocked<Repository<RiskFactorAssessmentResult>>;
  let profileRepo: jest.Mocked<Repository<HealthProfile>>;

  const mockProfile: HealthProfile = {
    id: 'profile-uuid-1',
    accountId: 'acc-uuid-1',
    fullName: 'Nguyen Van A',
    gender: ProfileGender.MALE,
    dob: '1979-05-15',
    hasDiabetes: true,
  } as unknown as HealthProfile;

  const mockResult: RiskFactorAssessmentResult = {
    id: 'result-uuid-1',
    assessmentInputId: 'input-uuid-1',
    riskScore: 8.0,
    riskLevel: VnDoctorRiskLevel.HIGH,
    doctorNote: 'High risk - follow lifestyle recommendations',
    evaluatedAt: new Date(),
  } as unknown as RiskFactorAssessmentResult;

  const mockInput: RiskFactorAssessmentInput = {
    id: 'input-uuid-1',
    healthProfileId: 'profile-uuid-1',
    facilityId: 'fac-uuid-1',
    hasUnderlyingDisease: false,
    chronicDiseaseIds: [],
    age: 45,
    gender: 'Nam',
    isSmoking: true,
    systolicBp: 145,
    totalCholesterol: 7.0,
    hdlCholesterol: 1.5,
    status: AssessmentStatus.SUBMITTED,
    assessmentDate: new Date(),
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
        RiskDictionaryService,
        {
          provide: TreatmentTargetsService,
          useValue: {
            generateFromRiskAssessment: jest.fn().mockResolvedValue(null),
          },
        },
        {
          provide: getRepositoryToken(RiskFactorAssessmentInput),
          useValue: {
            create: jest.fn().mockImplementation((dto: Partial<RiskFactorAssessmentInput>) => ({ id: 'new-input-id', ...dto } as RiskFactorAssessmentInput)),
            save: jest.fn().mockImplementation((inp: RiskFactorAssessmentInput) => Promise.resolve(inp)),
            findOne: jest.fn().mockResolvedValue(mockInput),
            softRemove: jest.fn().mockResolvedValue(mockInput),
          },
        },
        {
          provide: getRepositoryToken(RiskFactorAssessmentResult),
          useValue: {
            create: jest.fn().mockImplementation((dto: Partial<RiskFactorAssessmentResult>) => ({ id: 'new-result-id', ...dto } as RiskFactorAssessmentResult)),
            save: jest.fn().mockImplementation((res: RiskFactorAssessmentResult) => Promise.resolve(res)),
            findOne: jest.fn().mockResolvedValue(mockResult),
            softRemove: jest.fn().mockResolvedValue(mockResult),
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
            findOne: jest.fn().mockResolvedValue({ id: 'fac-uuid-1', facilityName: 'Clinic A' }),
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

  describe('getFormSchema', () => {
    it('should return dynamic form schema with auto-fill & locked fields for pre-existing disease', async () => {
      const schema = await service.getFormSchema('profile-uuid-1', 'acc-uuid-1');

      expect(schema.formCode).toBe('RISK_FACTOR_STRATIFICATION');
      expect(schema.patientInfo?.fullName).toBe('Nguyen Van A');
      expect(schema.patientInfo?.gender).toBe('Nam');

      const chronicSection = schema.sections.find((s) => s.code === 'CHRONIC_DISEASES');
      expect(chronicSection).toBeDefined();

      const diabetesField = chronicSection?.fields.find((f) => f.code === 'diabetes');
      expect(diabetesField?.disabled).toBe(true);
      expect(diabetesField?.defaultValue).toBe(true);
      expect(diabetesField?.fixedReason).toContain('hồ sơ sức khỏe');
    });

    it('should autofill isSmoking, diabetes, and hasUnderlyingDisease from HealthProfile', async () => {
      profileRepo.findOne.mockResolvedValueOnce({
        id: 'profile-uuid-2',
        accountId: 'acc-uuid-1',
        fullName: 'Le Van B',
        gender: ProfileGender.MALE,
        dob: '1980-01-01',
        isSmoking: true,
        hasHypertension: true,
        hasDyslipidemia: true,
        hasDiabetes: true,
      } as unknown as HealthProfile);

      const schema = await service.getFormSchema('profile-uuid-2', 'acc-uuid-1');

      const generalSection = schema.sections.find((s) => s.code === 'GENERAL_METRICS');
      const isSmokingField = generalSection?.fields.find((f) => f.code === 'isSmoking');
      expect(isSmokingField?.defaultValue).toBe(true);

      const hasUnderlyingField = generalSection?.fields.find((f) => f.code === 'hasUnderlyingDisease');
      expect(hasUnderlyingField?.defaultValue).toBe(true);

      const chronicSection = schema.sections.find((s) => s.code === 'CHRONIC_DISEASES');
      const diabetesField = chronicSection?.fields.find((f) => f.code === 'diabetes');
      expect(diabetesField?.defaultValue).toBe(true);
      expect(diabetesField?.disabled).toBe(true);
    });

    it('should throw NotFound if health profile does not exist', async () => {
      profileRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.getFormSchema('non-existent')).rejects.toThrow(NotFound);
    });
  });

  describe('create - Flow 1: No underlying disease (SCORE2)', () => {
    it('should calculate SCORE2 from 6 physiological metrics', async () => {
      const res = await service.create(
        {
          healthProfileId: 'profile-uuid-1',
          hasUnderlyingDisease: false,
          age: 45,
          gender: 'Nam',
          isSmoking: true,
          sbp: 145,
          cholesterol: 7.0,
          hdl: 1.5,
        },
        'acc-uuid-1',
      );

      expect(res).toBeDefined();
      expect(res.riskScore).toBeDefined();
      expect(res.riskLevel).toBeDefined();
      expect(inputRepo.save).toHaveBeenCalled();
    });
  });

  describe('create - Flow 2: Has underlying disease & complications', () => {
    it('should calculate risk level based on chronic diseases and organ damage', async () => {
      const res = await service.create(
        {
          healthProfileId: 'profile-uuid-1',
          hasUnderlyingDisease: true,
          diabetes: true,
          diabetesDurationYears: 10,
          glycemicControl: 'Không tốt',
          eGFR: 45,
          acr: 30,
          stroke: true,
          hasLeftVentricularHypertrophy: true,
        },
        'acc-uuid-1',
      );

      expect(res).toBeDefined();
      expect(res.riskLevel).toBe(VnDoctorRiskLevel.VERY_HIGH);
      expect(res.hasWarningAlert).toBe(true);
      expect(res.redFlags?.length).toBeGreaterThan(0);
    });
  });

  describe('evaluate', () => {
    it('should allow doctor to evaluate and update doctorNote and riskLevel', async () => {
      const res = await service.evaluate(
        'result-uuid-1',
        {
          doctorNote: 'Bệnh nhân có nguy cơ tim mạch rất cao cần dùng Statin liều cao',
          riskLevel: VnDoctorRiskLevel.VERY_HIGH,
        },
        'doctor-uuid-1',
      );

      expect(res).toBeDefined();
      expect(resultRepo.save).toHaveBeenCalled();
    });
  });
});
