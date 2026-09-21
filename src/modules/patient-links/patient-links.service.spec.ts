import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PatientLinksService } from './patient-links.service';
import { FacilitiesService } from '@/modules/facilities/facilities.service';
import { HealthProfilesService } from '@/modules/health-profiles/health-profiles.service';
import { FacilityPatientLinkStatus } from '@/commons/enums/vndoctor.enum';
import { Conflict, Forbidden, NotFound } from '@/commons/exceptions';
import type { StaffJwtPayload } from '@/commons/decorators/current-staff.decorator';
import { PatientLinksSseService } from './patient-links-sse.service';

import { Account } from '@/modules/accounts/entities/account.entity';
import { HealthProfile } from '@/modules/health-profiles/entities/health-profile.entity';

describe('PatientLinksService', () => {
  let service: PatientLinksService;

  const mockFacility = {
    id: 'fac-111',
    facilityCode: 'BV-01',
    facilityName: 'Bệnh viện TW',
    address: 'HCM',
    isActive: true,
  };

  const mockProfile: HealthProfile = {
    id: 'profile-111',
    accountId: 'account-111',
    facilityId: 'fac-111',
    isLinked: true,
    linkStatus: FacilityPatientLinkStatus.ACTIVE,
    hospitalPatientCode: 'BN-001',
    fullName: 'Nguyễn Văn Bệnh Nhân',
    phoneNumber: '0987654321',
    dob: '1990-01-01',
    gender: 'MALE' as unknown as HealthProfile['gender'],
    relationship: 'SELF' as unknown as HealthProfile['relationship'],
    bloodType: 'O' as unknown as HealthProfile['bloodType'],
    isSmoking: false,
    hasHypertension: false,
    hasDyslipidemia: false,
    hasDiabetes: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    generateId: () => {},
    healthRecords: [],
    examinations: [],
    riskAssessments: [],
    treatmentTargets: [],
    treatmentPlans: [],
  };

  const mockAccount = {
    id: 'account-111',
    phoneNumber: '0987654321',
  };

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[mockProfile], 1]),
    getMany: jest.fn().mockResolvedValue([mockProfile]),
  };

  const mockAccountRepository = {
    findOne: jest.fn(),
  };

  const mockHealthProfileRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
  };

  const mockFacilitiesService = {
    getFacilityById: jest.fn(),
  };

  const mockHealthProfilesService = {
    getProfileById: jest.fn(),
    getProfiles: jest.fn(),
  };

  const mockSseService = {
    emitInvitation: jest.fn(),
    emitStatusChange: jest.fn(),
    subscribe: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientLinksService,
        {
          provide: getRepositoryToken(Account),
          useValue: mockAccountRepository,
        },
        {
          provide: getRepositoryToken(HealthProfile),
          useValue: mockHealthProfileRepository,
        },
        {
          provide: FacilitiesService,
          useValue: mockFacilitiesService,
        },
        {
          provide: HealthProfilesService,
          useValue: mockHealthProfilesService,
        },
        {
          provide: PatientLinksSseService,
          useValue: mockSseService,
        },
      ],
    }).compile();

    service = module.get<PatientLinksService>(PatientLinksService);
    jest.clearAllMocks();
  });

  describe('createLink', () => {
    it('should link patient profile to facility successfully and emit SSE when PENDING', async () => {
      mockFacilitiesService.getFacilityById.mockResolvedValue(mockFacility);
      const unlinkedProfile = {
        ...mockProfile,
        facilityId: null,
        isLinked: false,
        linkStatus: FacilityPatientLinkStatus.NOT_LINKED,
      };
      mockHealthProfilesService.getProfileById.mockResolvedValue(unlinkedProfile);
      const savedPendingProfile = {
        ...unlinkedProfile,
        facilityId: 'fac-111',
        linkStatus: FacilityPatientLinkStatus.PENDING,
      };
      mockHealthProfileRepository.save.mockResolvedValue(savedPendingProfile);

      const result = await service.createLink({
        facilityId: 'fac-111',
        healthProfileId: 'profile-111',
        phoneNumber: '0987654321',
        status: FacilityPatientLinkStatus.PENDING,
      });

      expect(result.id).toBe('profile-111');
      expect(mockHealthProfileRepository.save).toHaveBeenCalled();
      expect(mockSseService.emitInvitation).toHaveBeenCalledWith(
        'account-111',
        expect.objectContaining({
          linkId: 'profile-111',
          facilityId: 'fac-111',
        }),
      );
    });

    it('should throw Conflict if link is already active on same facility', async () => {
      mockFacilitiesService.getFacilityById.mockResolvedValue(mockFacility);
      mockHealthProfilesService.getProfileById.mockResolvedValue(mockProfile);

      await expect(
        service.createLink({
          facilityId: 'fac-111',
          healthProfileId: 'profile-111',
          phoneNumber: '0987654321',
        }),
      ).rejects.toThrow(Conflict);
    });

    it('should throw Forbidden if staff attempts to link to a different facilityId', async () => {
      const staff: StaffJwtPayload = {
        id: 'staff-1',
        facilityId: 'fac-111',
        staffCode: 'ST-01',
        username: 'staff1',
        fullName: 'Staff 1',
        role: {} as unknown as StaffJwtPayload['role'],
        type: 'STAFF',
      };

      await expect(
        service.createLink(
          {
            facilityId: 'other-fac-999',
            healthProfileId: 'profile-111',
            phoneNumber: '0987654321',
          },
          staff,
        ),
      ).rejects.toThrow(Forbidden);
    });
  });

  describe('requestLink', () => {
    const staff: StaffJwtPayload = {
      id: 'staff-1',
      facilityId: 'fac-111',
      staffCode: 'ST-01',
      username: 'staff1',
      fullName: 'Staff 1',
      role: {} as unknown as StaffJwtPayload['role'],
      type: 'STAFF',
    };

    it('should send link request via phone number and emit SSE to patient account', async () => {
      mockFacilitiesService.getFacilityById.mockResolvedValue(mockFacility);
      const unlinkedProfile = {
        ...mockProfile,
        facilityId: null,
        isLinked: false,
        linkStatus: FacilityPatientLinkStatus.NOT_LINKED,
      };
      mockHealthProfilesService.getProfileById.mockResolvedValue(unlinkedProfile);
      mockAccountRepository.findOne.mockResolvedValue(mockAccount);
      const savedPendingProfile = {
        ...unlinkedProfile,
        facilityId: 'fac-111',
        linkStatus: FacilityPatientLinkStatus.PENDING,
      };
      mockHealthProfileRepository.save.mockResolvedValue(savedPendingProfile);

      const result = await service.requestLink(
        {
          healthProfileId: 'profile-111',
          phoneNumber: '0987654321',
        },
        staff,
      );

      expect(result.linkStatus).toBe(FacilityPatientLinkStatus.PENDING);
      expect(mockSseService.emitInvitation).toHaveBeenCalledWith(
        'account-111',
        expect.objectContaining({
          linkId: 'profile-111',
          facilityId: 'fac-111',
        }),
      );
    });

    it('should throw NotFound if patient account does not exist for phone number', async () => {
      mockFacilitiesService.getFacilityById.mockResolvedValue(mockFacility);
      mockHealthProfilesService.getProfileById.mockResolvedValue(mockProfile);
      mockAccountRepository.findOne.mockResolvedValue(null);

      await expect(
        service.requestLink(
          {
            healthProfileId: 'profile-111',
            phoneNumber: '0999999999',
          },
          staff,
        ),
      ).rejects.toThrow(NotFound);
    });
  });

  describe('getMyInvitations & getMyLinks', () => {
    it('should retrieve pending invitations for patient account', async () => {
      mockAccountRepository.findOne.mockResolvedValue(mockAccount);
      const result = await service.getMyInvitations('account-111');
      expect(result).toBeDefined();
      expect(mockHealthProfileRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it('should retrieve active links for patient account', async () => {
      const result = await service.getMyLinks('account-111');
      expect(result).toBeDefined();
      expect(mockHealthProfileRepository.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('acceptInvitation & rejectInvitation', () => {
    it('should accept pending invitation successfully and emit SSE', async () => {
      const pendingProfile = {
        ...mockProfile,
        linkStatus: FacilityPatientLinkStatus.PENDING,
        isLinked: false,
        accountId: null,
      };
      mockHealthProfileRepository.findOne.mockResolvedValue(pendingProfile);
      mockAccountRepository.findOne.mockResolvedValue(mockAccount);
      mockHealthProfileRepository.save.mockImplementation((p) => Promise.resolve(p));

      const result = await service.acceptInvitation('profile-111', 'account-111');

      expect(result.linkStatus).toBe(FacilityPatientLinkStatus.ACTIVE);
      expect(result.isLinked).toBe(true);
      expect(mockSseService.emitStatusChange).toHaveBeenCalledWith(
        'account-111',
        expect.objectContaining({ linkId: 'profile-111', status: 'ACTIVE' }),
      );
    });

    it('should reject pending invitation successfully and emit SSE', async () => {
      const pendingProfile = {
        ...mockProfile,
        linkStatus: FacilityPatientLinkStatus.PENDING,
        isLinked: false,
      };
      mockHealthProfileRepository.findOne.mockResolvedValue(pendingProfile);
      mockAccountRepository.findOne.mockResolvedValue(mockAccount);
      mockHealthProfileRepository.save.mockImplementation((p) => Promise.resolve(p));

      const result = await service.rejectInvitation('profile-111', 'account-111');

      expect(result.success).toBe(true);
      expect(mockSseService.emitStatusChange).toHaveBeenCalledWith(
        'account-111',
        expect.objectContaining({ linkId: 'profile-111', status: 'UNLINKED' }),
      );
    });

    it('should throw Forbidden if account does not own the profile or phone', async () => {
      const pendingProfile = {
        ...mockProfile,
        linkStatus: FacilityPatientLinkStatus.PENDING,
        accountId: 'other-acc',
        phoneNumber: '0123456789',
      };
      mockHealthProfileRepository.findOne.mockResolvedValue(pendingProfile);
      mockAccountRepository.findOne.mockResolvedValue({ id: 'other-account-999', phoneNumber: '0999999999' });

      await expect(
        service.acceptInvitation('profile-111', 'other-account-999'),
      ).rejects.toThrow(Forbidden);
    });
  });

  describe('unlinkPatient', () => {
    it('should change status to UNLINKED', async () => {
      mockHealthProfileRepository.findOne.mockResolvedValue({ ...mockProfile });
      mockHealthProfileRepository.save.mockResolvedValue({
        ...mockProfile,
        linkStatus: FacilityPatientLinkStatus.UNLINKED,
        isLinked: false,
      });

      const result = await service.unlinkPatient('fac-111', 'profile-111');
      expect(result.success).toBe(true);
    });

    it('should throw NotFound when link does not exist', async () => {
      mockHealthProfileRepository.findOne.mockResolvedValue(null);

      await expect(
        service.unlinkPatient('fac-111', 'non-existent'),
      ).rejects.toThrow(NotFound);
    });
  });
});
