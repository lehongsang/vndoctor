import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { PatientLinksService } from './patient-links.service';
import { FacilityPatientLink } from './entities/facility-patient-link.entity';
import { FacilitiesService } from '@/modules/facilities/facilities.service';
import { HealthProfilesService } from '@/modules/health-profiles/health-profiles.service';
import { FacilityPatientLinkStatus } from '@/commons/enums/vndoctor.enum';
import { Conflict, Forbidden, NotFound } from '@/commons/exceptions';
import type { StaffJwtPayload } from '@/commons/decorators/current-staff.decorator';
import { PatientLinksSseService } from './patient-links-sse.service';

describe('PatientLinksService', () => {
  let service: PatientLinksService;

  const mockFacility = {
    id: 'fac-111',
    facilityCode: 'BV-01',
    facilityName: 'Bệnh viện TW',
    address: 'HCM',
    isActive: true,
  };

  const mockProfile = {
    id: 'profile-111',
    accountId: 'account-111',
    fullName: 'Nguyễn Văn Bệnh Nhân',
    phoneNumber: '0987654321',
  };

  const mockLink: FacilityPatientLink = {
    id: 'link-01',
    facilityId: 'fac-111',
    facility: mockFacility as unknown as FacilityPatientLink['facility'],
    healthProfileId: 'profile-111',
    healthProfile: mockProfile as unknown as FacilityPatientLink['healthProfile'],
    phoneNumber: '0987654321',
    hospitalPatientCode: 'BN-001',
    status: FacilityPatientLinkStatus.ACTIVE,
    linkedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    generateId: () => {},
  };

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([[mockLink], 1]),
    getMany: jest.fn().mockResolvedValue([mockLink]),
  };

  const mockRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
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
          provide: getRepositoryToken(FacilityPatientLink),
          useValue: mockRepository,
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
      mockHealthProfilesService.getProfileById.mockResolvedValue(mockProfile);
      mockRepository.findOne.mockResolvedValue(null);
      const pendingLink = { ...mockLink, status: FacilityPatientLinkStatus.PENDING };
      mockRepository.create.mockReturnValue(pendingLink);
      mockRepository.save.mockResolvedValue(pendingLink);

      const result = await service.createLink({
        facilityId: 'fac-111',
        healthProfileId: 'profile-111',
        phoneNumber: '0987654321',
        hospitalPatientCode: 'BN-001',
        status: FacilityPatientLinkStatus.PENDING,
      });

      expect(result.id).toBe('link-01');
      expect(mockRepository.save).toHaveBeenCalled();
      expect(mockSseService.emitInvitation).toHaveBeenCalledWith(
        'account-111',
        expect.objectContaining({
          linkId: 'link-01',
          facilityId: 'fac-111',
        }),
      );
    });

    it('should throw Conflict if link is already active', async () => {
      mockFacilitiesService.getFacilityById.mockResolvedValue(mockFacility);
      mockHealthProfilesService.getProfileById.mockResolvedValue(mockProfile);
      mockRepository.findOne.mockResolvedValue(mockLink);

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

  describe('getMyInvitations & getMyLinks', () => {
    it('should retrieve pending invitations for patient account', async () => {
      const result = await service.getMyInvitations('account-111');
      expect(result).toBeDefined();
      expect(mockRepository.createQueryBuilder).toHaveBeenCalled();
    });

    it('should retrieve active links for patient account', async () => {
      const result = await service.getMyLinks('account-111');
      expect(result).toBeDefined();
      expect(mockRepository.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('acceptInvitation & rejectInvitation', () => {
    it('should accept pending invitation successfully and emit SSE', async () => {
      const pendingLink = {
        ...mockLink,
        status: FacilityPatientLinkStatus.PENDING,
        healthProfile: mockProfile,
      };
      mockRepository.findOne.mockResolvedValue(pendingLink);
      mockRepository.save.mockImplementation((link) => Promise.resolve(link));

      const result = await service.acceptInvitation('link-01', 'account-111');

      expect(result.status).toBe(FacilityPatientLinkStatus.ACTIVE);
      expect(mockSseService.emitStatusChange).toHaveBeenCalledWith(
        'account-111',
        expect.objectContaining({ linkId: 'link-01', status: 'ACTIVE' }),
      );
    });

    it('should reject pending invitation successfully and emit SSE', async () => {
      const pendingLink = {
        ...mockLink,
        status: FacilityPatientLinkStatus.PENDING,
        healthProfile: mockProfile,
      };
      mockRepository.findOne.mockResolvedValue(pendingLink);
      mockRepository.save.mockImplementation((link) => Promise.resolve(link));

      const result = await service.rejectInvitation('link-01', 'account-111');

      expect(result.success).toBe(true);
      expect(mockSseService.emitStatusChange).toHaveBeenCalledWith(
        'account-111',
        expect.objectContaining({ linkId: 'link-01', status: 'UNLINKED' }),
      );
    });

    it('should throw Forbidden if account does not own the profile', async () => {
      const pendingLink = {
        ...mockLink,
        status: FacilityPatientLinkStatus.PENDING,
        healthProfile: mockProfile,
      };
      mockRepository.findOne.mockResolvedValue(pendingLink);

      await expect(
        service.acceptInvitation('link-01', 'other-account-999'),
      ).rejects.toThrow(Forbidden);
    });
  });

  describe('unlinkPatient', () => {
    it('should change status to UNLINKED', async () => {
      mockRepository.findOne.mockResolvedValue({ ...mockLink });
      mockRepository.save.mockResolvedValue({
        ...mockLink,
        status: FacilityPatientLinkStatus.UNLINKED,
      });

      const result = await service.unlinkPatient('fac-111', 'profile-111');
      expect(result.success).toBe(true);
    });

    it('should throw NotFound when link does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.unlinkPatient('fac-111', 'non-existent'),
      ).rejects.toThrow(NotFound);
    });
  });
});
