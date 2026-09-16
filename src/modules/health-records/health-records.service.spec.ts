import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { HealthRecordsService } from './health-records.service';
import { HealthRecord } from './entities/health-record.entity';
import { HealthProfile } from '@/modules/health-profiles/entities/health-profile.entity';
import { HealthMetricType } from '@/commons/enums/vndoctor.enum';
import { Forbidden, NotFound } from '@/commons/exceptions';
import { classifyBloodPressure } from './helpers/blood-pressure-classifier.helper';

describe('HealthRecordsService & Blood Pressure Classifier', () => {
  let service: HealthRecordsService;
  let recordRepo: jest.Mocked<Repository<HealthRecord>>;
  let profileRepo: jest.Mocked<Repository<HealthProfile>>;

  const mockProfile: HealthProfile = {
    id: 'profile-uuid-1',
    accountId: 'acc-uuid-1',
    fullName: 'Nguyen Van A',
    relationship: 'SELF' as unknown as HealthProfile['relationship'],
    gender: 'MALE' as unknown as HealthProfile['gender'],
    dob: '1990-01-01',
    phoneNumber: '0987654321',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as HealthProfile;

  const mockRecord: HealthRecord = {
    id: 'record-uuid-1',
    healthProfileId: 'profile-uuid-1',
    metricType: HealthMetricType.BLOOD_PRESSURE,
    valueNumeric: 120,
    secondaryValue: 80,
    unit: 'mmHg',
    note: 'Morning measurement',
    measuredAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    healthProfile: mockProfile,
  } as unknown as HealthRecord;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthRecordsService,
        {
          provide: getRepositoryToken(HealthRecord),
          useValue: {
            create: jest.fn().mockImplementation((dto: Partial<HealthRecord>) => ({ id: 'new-record-id', ...dto } as HealthRecord)),
            save: jest.fn().mockImplementation((rec: HealthRecord) => Promise.resolve(rec)),
            findAndCount: jest.fn().mockResolvedValue([[mockRecord], 1]),
            findOne: jest.fn().mockResolvedValue(mockRecord),
            remove: jest.fn().mockResolvedValue(mockRecord),
          },
        },
        {
          provide: getRepositoryToken(HealthProfile),
          useValue: {
            findOne: jest.fn().mockResolvedValue(mockProfile),
          },
        },
      ],
    }).compile();

    service = module.get<HealthRecordsService>(HealthRecordsService);
    recordRepo = module.get(getRepositoryToken(HealthRecord));
    profileRepo = module.get(getRepositoryToken(HealthProfile));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('classifyBloodPressure Helper Tests', () => {
    it('should return INVALID_DATA when DIA >= SYS', () => {
      const res = classifyBloodPressure(120, 120);
      expect(res.level).toBe('INVALID_DATA');
      expect(res.label).toBe('Lỗi');
    });

    it('should return CRITICAL_DANGER for SYS < 70 and DIA < 70', () => {
      const res = classifyBloodPressure(65, 50);
      expect(res.level).toBe('CRITICAL_DANGER');
      expect(res.isDanger).toBe(true);
    });

    it('should return LOW_DIASTOLIC for SYS 75, DIA 50', () => {
      const res = classifyBloodPressure(75, 50);
      expect(res.level).toBe('LOW_DIASTOLIC');
      expect(res.label).toBe('Huyết áp tâm trương thấp');
    });

    it('should return NORMAL for SYS 115, DIA 75', () => {
      const res = classifyBloodPressure(115, 75);
      expect(res.level).toBe('NORMAL');
      expect(res.label).toBe('Huyết áp không tăng');
    });

    it('should return PRE_HYPERTENSION for SYS 135, DIA 80', () => {
      const res = classifyBloodPressure(135, 80);
      expect(res.level).toBe('PRE_HYPERTENSION');
      expect(res.label).toBe('Tiền THA');
    });

    it('should return STAGE_1 with isolated systolic for SYS 145, DIA 80', () => {
      const res = classifyBloodPressure(145, 80);
      expect(res.level).toBe('STAGE_1');
      expect(res.subType).toBe('THA tâm THU đơn độc');
    });

    it('should return STAGE_1 with isolated diastolic for SYS 120, DIA 95', () => {
      const res = classifyBloodPressure(120, 95);
      expect(res.level).toBe('STAGE_1');
      expect(res.subType).toBe('THA tâm trương đơn độc');
    });

    it('should return STAGE_2 for SYS 165, DIA 102', () => {
      const res = classifyBloodPressure(165, 102);
      expect(res.level).toBe('STAGE_2');
      expect(res.label).toBe('THA độ 2');
    });

    it('should return STAGE_3 and danger for SYS 185, DIA 115', () => {
      const res = classifyBloodPressure(185, 115);
      expect(res.level).toBe('STAGE_3');
      expect(res.label).toBe('THA độ 3');
      expect(res.isDanger).toBe(true);
    });
  });

  describe('create', () => {
    it('should create a health record with VNHA evaluation', async () => {
      const result = await service.create(
        {
          healthProfileId: 'profile-uuid-1',
          metricType: HealthMetricType.BLOOD_PRESSURE,
          valueNumeric: 125,
          secondaryValue: 82,
          unit: 'mmHg',
        },
        'acc-uuid-1',
      );

      expect(profileRepo.findOne).toHaveBeenCalledWith({ where: { id: 'profile-uuid-1' } });
      expect(recordRepo.create).toHaveBeenCalled();
      expect(recordRepo.save).toHaveBeenCalled();
      expect(result.valueNumeric).toEqual(125);
      expect(result.evaluation).toBeDefined();
      expect(result.evaluation?.level).toBe('NORMAL');
    });

    it('should throw NotFound if profile does not exist', async () => {
      profileRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.create(
          {
            healthProfileId: 'invalid-id',
            metricType: HealthMetricType.BLOOD_PRESSURE,
            valueNumeric: 120,
            unit: 'mmHg',
          },
          'acc-uuid-1',
        ),
      ).rejects.toThrow(NotFound);
    });

    it('should throw Forbidden if account does not own profile', async () => {
      await expect(
        service.create(
          {
            healthProfileId: 'profile-uuid-1',
            metricType: HealthMetricType.BLOOD_PRESSURE,
            valueNumeric: 120,
            unit: 'mmHg',
          },
          'other-acc-uuid',
        ),
      ).rejects.toThrow(Forbidden);
    });
  });

  describe('findAll', () => {
    it('should return paginated health records with evaluations', async () => {
      const result = await service.findAll(
        { healthProfileId: 'profile-uuid-1', page: 1, limit: 10 },
        'acc-uuid-1',
      );

      expect(result.data).toHaveLength(1);
      expect(result.total).toEqual(1);
      expect(result.data[0].evaluation).toBeDefined();
    });
  });

  describe('findOne', () => {
    it('should return a record by id with evaluation', async () => {
      const result = await service.findOne('record-uuid-1', 'acc-uuid-1');
      expect(result.id).toEqual('record-uuid-1');
      expect(result.evaluation).toBeDefined();
    });

    it('should throw NotFound if record does not exist', async () => {
      recordRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.findOne('invalid-record-id')).rejects.toThrow(NotFound);
    });
  });

  describe('getLatestSummary', () => {
    it('should return latest summary map for all metrics', async () => {
      const result = await service.getLatestSummary('profile-uuid-1', undefined, 'acc-uuid-1');
      expect(result).toBeDefined();
    });

    it('should return latest summary for a specific metricType', async () => {
      const result = await service.getLatestSummary('profile-uuid-1', HealthMetricType.BLOOD_PRESSURE, 'acc-uuid-1');
      expect(result).toBeDefined();
      expect(result[HealthMetricType.BLOOD_PRESSURE]).toBeDefined();
    });
  });
});
