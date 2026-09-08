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

  const mockRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockFacilitiesService = {
    getFacilityById: jest.fn(),
  };

  const mockHealthProfilesService = {
    getProfileById: jest.fn(),
    getProfiles: jest.fn(),
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
      ],
    }).compile();

    service = module.get<PatientLinksService>(PatientLinksService);
    jest.clearAllMocks();
  });

  describe('createLink', () => {
    it('should link patient profile to facility successfully', async () => {
      mockFacilitiesService.getFacilityById.mockResolvedValue(mockFacility);
      mockHealthProfilesService.getProfileById.mockResolvedValue(mockProfile);
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockLink);
      mockRepository.save.mockResolvedValue(mockLink);

      const result = await service.createLink({
        facilityId: 'fac-111',
        healthProfileId: 'profile-111',
        phoneNumber: '0987654321',
        hospitalPatientCode: 'BN-001',
      });

      expect(result.id).toBe('link-01');
      expect(mockRepository.save).toHaveBeenCalled();
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
