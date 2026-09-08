import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { ExaminationsService } from './examinations.service';
import { Examination } from './entities/examination.entity';
import { HealthProfile } from '@/modules/health-profiles/entities/health-profile.entity';
import { Facility } from '@/modules/facilities/entities/facility.entity';
import { StaffUser } from '@/modules/staff/entities/staff-user.entity';
import { ExaminationStatus } from '@/commons/enums/vndoctor.enum';
import { NotFound } from '@/commons/exceptions';

describe('ExaminationsService', () => {
  let service: ExaminationsService;
  let examRepo: jest.Mocked<Repository<Examination>>;
  let profileRepo: jest.Mocked<Repository<HealthProfile>>;
  let facilityRepo: jest.Mocked<Repository<Facility>>;

  const mockProfile: HealthProfile = {
    id: 'profile-uuid-1',
    accountId: 'acc-uuid-1',
    fullName: 'Tran Thi C',
    gender: 'FEMALE' as any,
    dateOfBirth: '1975-03-20',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  } as unknown as HealthProfile;

  const mockFacility: Facility = {
    id: 'fac-uuid-1',
    facilityName: 'BV Quan 1',
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  } as unknown as Facility;

  const mockExam: Examination = {
    id: 'exam-uuid-1',
    examinationCode: 'EX-20260908-1234',
    healthProfileId: 'profile-uuid-1',
    doctorId: 'doctor-uuid-1',
    facilityId: 'fac-uuid-1',
    heartRate: 75,
    systolicBp: 130,
    diastolicBp: 85,
    heightCm: 160,
    weightKg: 55,
    bmi: 21.48,
    diagnosis: 'Tăng huyết áp độ 1',
    icd10Code: 'I10',
    status: ExaminationStatus.IN_PROGRESS,
    examinationDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  } as unknown as Examination;

  beforeEach(async () => {
    const mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockExam], 1]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExaminationsService,
        {
          provide: getRepositoryToken(Examination),
          useValue: {
            create: jest.fn().mockImplementation((dto: Partial<Examination>) => ({ id: 'new-exam-id', ...dto } as Examination)),
            save: jest.fn().mockImplementation((ex: Examination) => Promise.resolve(ex)),
            findOne: jest.fn().mockResolvedValue(mockExam),
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
            findOne: jest.fn().mockResolvedValue(mockFacility),
          },
        },
        {
          provide: getRepositoryToken(StaffUser),
          useValue: {
            findOne: jest.fn().mockResolvedValue({ id: 'doctor-uuid-1', fullName: 'BS Nguyen' }),
          },
        },
      ],
    }).compile();

    service = module.get<ExaminationsService>(ExaminationsService);
    examRepo = module.get(getRepositoryToken(Examination));
    profileRepo = module.get(getRepositoryToken(HealthProfile));
    facilityRepo = module.get(getRepositoryToken(Facility));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an examination record and calculate BMI', async () => {
      examRepo.findOne.mockResolvedValueOnce(null);

      const result = await service.create(
        {
          healthProfileId: 'profile-uuid-1',
          heightCm: 160,
          weightKg: 55,
          diagnosis: 'Tăng huyết áp độ 1',
          icd10Code: 'I10',
          systolicBp: 130,
          diastolicBp: 85,
        },
        'doctor-uuid-1',
        'fac-uuid-1',
      );

      expect(profileRepo.findOne).toHaveBeenCalledWith({ where: { id: 'profile-uuid-1' } });
      expect(facilityRepo.findOne).toHaveBeenCalledWith({ where: { id: 'fac-uuid-1' } });
      expect(examRepo.create).toHaveBeenCalled();
      expect(examRepo.save).toHaveBeenCalled();
      expect(result.bmi).toBeCloseTo(21.48, 1);
    });

    it('should throw NotFound if profile not found', async () => {
      profileRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.create(
          {
            healthProfileId: 'invalid-profile',
            diagnosis: 'Test',
          },
          'doctor-uuid-1',
          'fac-uuid-1',
        ),
      ).rejects.toThrow(NotFound);
    });
  });

  describe('update', () => {
    it('should update examination successfully', async () => {
      const result = await service.update('exam-uuid-1', {
        status: ExaminationStatus.COMPLETED,
        treatmentPlan: 'Take medication daily',
      });

      expect(examRepo.findOne).toHaveBeenCalled();
      expect(examRepo.save).toHaveBeenCalled();
      expect(result.status).toEqual(ExaminationStatus.COMPLETED);
    });

    it('should throw NotFound if examination not found', async () => {
      examRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.update('invalid-exam-id', { diagnosis: 'Updated' }),
      ).rejects.toThrow(NotFound);
    });
  });

  describe('findAll', () => {
    it('should return paginated examinations', async () => {
      const result = await service.findAll({ page: 1, limit: 10 });
      expect(result.data).toHaveLength(1);
      expect(result.total).toEqual(1);
    });
  });

  describe('findByCode', () => {
    it('should return examination by unique code', async () => {
      const result = await service.findByCode('EX-20260908-1234');
      expect(result.examinationCode).toEqual('EX-20260908-1234');
    });
  });
});
