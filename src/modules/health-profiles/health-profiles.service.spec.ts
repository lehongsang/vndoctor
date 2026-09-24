import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HealthProfilesService } from './health-profiles.service';
import { HealthProfile } from './entities/health-profile.entity';
import {
  ProfileBloodType,
  ProfileGender,
  ProfileRelationship,
  StaffRole,
} from '@/commons/enums/vndoctor.enum';
import { Conflict, Forbidden, NotFound } from '@/commons/exceptions';

import { Account } from '@/modules/accounts/entities/account.entity';
import { PatientCareSubscription } from '@/modules/care-subscriptions/entities/care-subscription.entity';

describe('HealthProfilesService', () => {
  let service: HealthProfilesService;

  const mockProfile: HealthProfile = {
    id: 'profile-111',
    accountId: 'acc-111',
    account: {} as unknown as HealthProfile['account'],
    facilityId: 'facility-1',
    isLinked: true,
    linkStatus: 'ACTIVE' as unknown as HealthProfile['linkStatus'],
    hospitalPatientCode: 'BN-20260916-A1B2',
    linkedAt: new Date(),
    relationship: ProfileRelationship.SELF,
    fullName: 'Trần Thị Mai',
    dob: '1985-05-20',
    gender: ProfileGender.FEMALE,
    citizenId: '079185001234',
    phoneNumber: '0987654321',
    address: 'Hồ Chí Minh',
    bloodType: ProfileBloodType.O,
    allergy: 'Penicillin',
    medicalHistory: 'None',
    height: 170,
    weight: 65,
    isSmoking: false,
    hasHypertension: false,
    hasDyslipidemia: false,
    hasDiabetes: false,
    hasStroke: false,
    hasMyocardialInfarction: false,
    hasAcuteCoronarySyndrome: false,
    hasCoronaryArteryDisease: false,
    hasTia: false,
    hasAorticAneurysm: false,
    hasPeripheralArteryDisease: false,
    hasAtherosclerosis: false,
    hasFamilialHypercholesterolemia: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    generateId: () => {},
    healthRecords: [],
    examinations: [],
    riskAssessments: [],
    treatmentTargets: [],
    treatmentPlans: [],
  };

  const mockRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    softRemove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockAccountRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockCareSubscriptionRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthProfilesService,
        {
          provide: getRepositoryToken(HealthProfile),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(Account),
          useValue: mockAccountRepository,
        },
        {
          provide: getRepositoryToken(PatientCareSubscription),
          useValue: mockCareSubscriptionRepository,
        },
      ],
    }).compile();

    service = module.get<HealthProfilesService>(HealthProfilesService);
    jest.clearAllMocks();
  });

  describe('createAppProfile', () => {
    it('should create a SELF profile successfully when none exists', async () => {
      mockRepository.findOne
        .mockResolvedValueOnce(null) // SELF check
        .mockResolvedValueOnce(mockProfile); // getProfileById reload
      mockRepository.create.mockReturnValue(mockProfile);
      mockRepository.save.mockResolvedValue(mockProfile);

      const result = await service.createAppProfile(
        {
          relationship: ProfileRelationship.SELF,
          fullName: 'Trần Thị Mai',
          dob: '1985-05-20',
          gender: ProfileGender.FEMALE,
        },
        'acc-111',
      );

      expect(result.id).toBe('profile-111');
    });

    it('should throw Conflict when creating a second SELF profile for same account', async () => {
      mockRepository.findOne.mockResolvedValueOnce(mockProfile);

      await expect(
        service.createAppProfile(
          {
            relationship: ProfileRelationship.SELF,
            fullName: 'Trần Thị Mai 2',
            dob: '1985-05-20',
            gender: ProfileGender.FEMALE,
          },
          'acc-111',
        ),
      ).rejects.toThrow(Conflict);
    });
  });

  describe('createFacilityProfile', () => {
    it('should allow Staff to create an independent profile and assign facilityId', async () => {
      const createdFacilityProfile = {
        ...mockProfile,
        id: 'profile-fac-1',
        accountId: null,
        facilityId: 'facility-1',
      };
      mockRepository.create.mockReturnValue(createdFacilityProfile);
      mockRepository.save.mockResolvedValue(createdFacilityProfile);
      mockRepository.findOne.mockResolvedValue(createdFacilityProfile);

      const result = await service.createFacilityProfile(
        {
          fullName: 'Bệnh Nhân Test',
          dob: '1990-01-01',
          gender: ProfileGender.MALE,
          phoneNumber: '0988776655',
        },
        {
          id: 'staff-1',
          facilityId: 'facility-1',
          staffCode: 'STAFF01',
          fullName: 'BS. Admin',
          role: StaffRole.DOCTOR,
          username: 'admin',
          type: 'STAFF',
        },
      );

      expect(result).toBeDefined();
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          accountId: null,
          facilityId: 'facility-1',
          fullName: 'Bệnh Nhân Test',
          hospitalPatientCode: expect.stringMatching(/^BN-\d{8}-[A-Z0-9]{4}$/),
        }),
      );
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw Forbidden if staff has no facilityId', async () => {
      await expect(
        service.createFacilityProfile(
          {
            fullName: 'Bệnh Nhân Test',
            dob: '1990-01-01',
            gender: ProfileGender.MALE,
          },
          {
            id: 'staff-1',
            facilityId: '',
            staffCode: 'STAFF01',
            fullName: 'BS. Admin',
            role: StaffRole.DOCTOR,
            username: 'admin',
            type: 'STAFF',
          },
        ),
      ).rejects.toThrow(Forbidden);
    });
  });

  describe('updateProfile', () => {
    it('should update profile fields successfully', async () => {
      mockRepository.findOne
        .mockResolvedValueOnce({ ...mockProfile }) // getProfileById
        .mockResolvedValueOnce({ ...mockProfile, fullName: 'Tên Mới' }); // reload
      mockRepository.save.mockResolvedValue({ ...mockProfile, fullName: 'Tên Mới' });

      const result = await service.updateProfile(
        'profile-111',
        {
          fullName: 'Tên Mới',
          hasStroke: true,
          height: 172,
          weight: 68,
        },
        'acc-111',
      );

      expect(result).toBeDefined();
      expect(mockRepository.save).toHaveBeenCalled();
    });
  });

  describe('deleteProfile', () => {
    it('should delete profile when authorized', async () => {
      mockRepository.findOne.mockResolvedValueOnce(mockProfile);
      mockRepository.softRemove.mockResolvedValueOnce(mockProfile);

      const res = await service.deleteProfile('profile-111', 'acc-111');
      expect(res.success).toBe(true);
      expect(mockRepository.softRemove).toHaveBeenCalledWith(mockProfile);
    });
  });

  describe('getProfileById', () => {
    it('should return profile when owned by account', async () => {
      mockRepository.findOne.mockResolvedValue(mockProfile);

      const result = await service.getProfileById('profile-111', 'acc-111');
      expect(result.id).toBe('profile-111');
    });

    it('should throw Forbidden when profile belongs to another account', async () => {
      mockRepository.findOne.mockResolvedValue(mockProfile);

      await expect(
        service.getProfileById('profile-111', 'other-account-999'),
      ).rejects.toThrow(Forbidden);
    });

    it('should throw NotFound when profile does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.getProfileById('non-existent')).rejects.toThrow(
        NotFound,
      );
    });
  });

  describe('getFacilityProfiles', () => {
    it('should return paginated health profiles linked to staff facility', async () => {
      const mockQb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockProfile], 1]),
      };
      mockRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.getFacilityProfiles(
        { page: 1, limit: 10 },
        {
          id: 'staff-1',
          facilityId: 'facility-1',
          staffCode: 'STAFF01',
          fullName: 'Nguyễn Văn Admin',
          role: StaffRole.ADMIN,
          username: 'admin',
          type: 'STAFF',
        },
      );

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'profile.facilityId = :facilityId',
        { facilityId: 'facility-1' },
      );
    });

    it('should throw Forbidden when regular staff attempts to query another facility', async () => {
      await expect(
        service.getFacilityProfiles(
          { facilityId: 'facility-other' },
          {
            id: 'staff-1',
            facilityId: 'facility-1',
            staffCode: 'DOC01',
            fullName: 'BS. Nguyễn Văn A',
            role: StaffRole.DOCTOR,
            username: 'doc',
            type: 'STAFF',
          },
        ),
      ).rejects.toThrow(Forbidden);
    });
  });

  describe('getProfileList', () => {
    it('should return assigned patient profiles with subscriptions for doctor', async () => {
      const mockSub = {
        id: 'sub-1',
        healthProfileId: 'profile-111',
        carePackageId: 'package-1',
        assignedDoctorId: 'staff-1',
        healthProfile: {
          ...mockProfile,
        },
        carePackage: {
          id: 'package-1',
          packageName: 'Gói Chăm Sóc Đái Tháo Đường',
          facilityId: 'facility-1',
        },
        assignedDoctor: {
          id: 'staff-1',
          fullName: 'BS. Nguyễn Văn An',
        },
        status: 'ACTIVE',
        createdAt: new Date(),
      };

      const mockQb = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockSub], 1]),
      };
      mockCareSubscriptionRepository.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.getProfileList(
        { page: 1, limit: 10 },
        {
          id: 'staff-1',
          facilityId: 'facility-1',
          staffCode: 'DOC01',
          fullName: 'BS. Nguyễn Văn An',
          role: StaffRole.DOCTOR,
          username: 'dr_an',
          type: 'STAFF',
        },
      );

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.items[0].id).toBe('profile-111');
      expect(result.items[0].subscription).toBeDefined();
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        'sub.assignedDoctorId = :targetDoctorId',
        { targetDoctorId: 'staff-1' },
      );
    });

    it('should throw Forbidden when doctor attempts to query another doctor id', async () => {
      await expect(
        service.getProfileList(
          { doctorId: 'other-doctor-id' },
          {
            id: 'staff-1',
            facilityId: 'facility-1',
            staffCode: 'DOC01',
            fullName: 'BS. Nguyễn Văn An',
            role: StaffRole.DOCTOR,
            username: 'dr_an',
            type: 'STAFF',
          },
        ),
      ).rejects.toThrow(Forbidden);
    });
  });
});
