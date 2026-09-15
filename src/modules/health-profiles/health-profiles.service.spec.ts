import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HealthProfilesService } from './health-profiles.service';
import { HealthProfile } from './entities/health-profile.entity';
import { ChronicDiseasesService } from '@/modules/chronic-diseases/chronic-diseases.service';
import {
  ProfileBloodType,
  ProfileGender,
  ProfileRelationship,
  StaffRole,
} from '@/commons/enums/vndoctor.enum';
import { Conflict, Forbidden, NotFound } from '@/commons/exceptions';

import { Account } from '@/modules/accounts/entities/account.entity';
import { FacilityPatientLink } from '@/modules/patient-links/entities/facility-patient-link.entity';

describe('HealthProfilesService', () => {
  let service: HealthProfilesService;

  const mockProfile: HealthProfile = {
    id: 'profile-111',
    accountId: 'acc-111',
    account: {} as unknown as HealthProfile['account'],
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
    createdAt: new Date(),
    updatedAt: new Date(),
    generateId: () => {},
    facilityLinks: [],
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

  const mockLinkRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockChronicDiseasesService = {
    setProfileDiseases: jest.fn(),
    getProfileDiseases: jest.fn(),
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
          provide: getRepositoryToken(FacilityPatientLink),
          useValue: mockLinkRepository,
        },
        {
          provide: ChronicDiseasesService,
          useValue: mockChronicDiseasesService,
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
          chronicDiseaseIds: ['disease-01'],
        },
        'acc-111',
      );

      expect(result.id).toBe('profile-111');
      expect(mockChronicDiseasesService.setProfileDiseases).toHaveBeenCalledWith(
        'profile-111',
        ['disease-01'],
      );
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
    it('should allow Staff to create an independent profile and auto-link to facility', async () => {
      const createdFacilityProfile = {
        ...mockProfile,
        id: 'profile-fac-1',
        accountId: null,
      };
      mockRepository.create.mockReturnValue(createdFacilityProfile);
      mockRepository.save.mockResolvedValue(createdFacilityProfile);
      mockRepository.findOne.mockResolvedValue(createdFacilityProfile);
      mockLinkRepository.create.mockReturnValue({});
      mockLinkRepository.save.mockResolvedValue({});

      const result = await service.createFacilityProfile(
        {
          fullName: 'Bệnh Nhân Test',
          dob: '1990-01-01',
          gender: ProfileGender.MALE,
          phoneNumber: '0988776655',
          hospitalPatientCode: 'BN-001',
          chronicDiseaseIds: ['disease-01'],
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
          fullName: 'Bệnh Nhân Test',
        }),
      );
      expect(mockLinkRepository.save).toHaveBeenCalled();
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
    it('should update profile fields and chronic diseases', async () => {
      mockRepository.findOne
        .mockResolvedValueOnce({ ...mockProfile }) // getProfileById
        .mockResolvedValueOnce({ ...mockProfile, fullName: 'Tên Mới' }); // reload
      mockRepository.save.mockResolvedValue({ ...mockProfile, fullName: 'Tên Mới' });

      const result = await service.updateProfile(
        'profile-111',
        {
          fullName: 'Tên Mới',
          chronicDiseaseIds: ['cd-1'],
        },
        'acc-111',
      );

      expect(result).toBeDefined();
      expect(mockChronicDiseasesService.setProfileDiseases).toHaveBeenCalledWith('profile-111', ['cd-1']);
    });

    it('should allow Staff to update profile and hospitalPatientCode', async () => {
      const linkedProfile = {
        ...mockProfile,
        facilityLinks: [{ facilityId: 'facility-1' }] as unknown as HealthProfile['facilityLinks'],
      };
      mockRepository.findOne
        .mockResolvedValueOnce(linkedProfile) // getProfileById
        .mockResolvedValueOnce(linkedProfile); // reload
      mockRepository.save.mockResolvedValue(linkedProfile);
      mockLinkRepository.findOne.mockResolvedValueOnce({ facilityId: 'facility-1', hospitalPatientCode: 'OLD' });
      mockLinkRepository.save.mockResolvedValue({});

      const result = await service.updateProfile(
        'profile-111',
        {
          fullName: 'Bệnh Nhân Cập Nhật',
          hospitalPatientCode: 'BN-NEW-99',
        },
        {
          type: 'STAFF',
          userId: 'staff-1',
          facilityId: 'facility-1',
          staff: {
            id: 'staff-1',
            facilityId: 'facility-1',
            staffCode: 'STAFF01',
            fullName: 'BS. Admin',
            role: StaffRole.DOCTOR,
            username: 'admin',
            type: 'STAFF',
          },
        },
      );

      expect(result).toBeDefined();
      expect(mockLinkRepository.save).toHaveBeenCalled();
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
        innerJoin: jest.fn().mockReturnThis(),
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
      expect(mockQb.innerJoin).toHaveBeenCalledWith(
        'profile.facilityLinks',
        'activeLink',
        'activeLink.facilityId = :facilityId AND activeLink.status = :linkStatus',
        { facilityId: 'facility-1', linkStatus: 'ACTIVE' },
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
});
