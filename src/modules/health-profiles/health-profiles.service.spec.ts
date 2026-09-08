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
} from '@/commons/enums/vndoctor.enum';
import { Conflict, Forbidden, NotFound } from '@/commons/exceptions';

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
    createQueryBuilder: jest.fn(),
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
          provide: ChronicDiseasesService,
          useValue: mockChronicDiseasesService,
        },
      ],
    }).compile();

    service = module.get<HealthProfilesService>(HealthProfilesService);
    jest.clearAllMocks();
  });

  describe('createProfile', () => {
    it('should create a SELF profile successfully when none exists', async () => {
      mockRepository.findOne
        .mockResolvedValueOnce(null) // SELF check
        .mockResolvedValueOnce(mockProfile); // getProfileById reload
      mockRepository.create.mockReturnValue(mockProfile);
      mockRepository.save.mockResolvedValue(mockProfile);

      const result = await service.createProfile(
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
        service.createProfile(
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
});
