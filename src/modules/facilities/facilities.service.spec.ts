import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FacilitiesService } from './facilities.service';
import { Facility } from './entities/facility.entity';
import { FacilityType, StaffRole } from '@/commons/enums/vndoctor.enum';
import { Conflict, Forbidden, NotFound } from '@/commons/exceptions';
import type { StaffJwtPayload } from '@/commons/decorators/current-staff.decorator';

describe('FacilitiesService', () => {
  let service: FacilitiesService;

  const mockParentFacility: Facility = {
    id: 'provincial-111',
    facilityCode: 'BV-TINH-01',
    facilityName: 'Bệnh viện Đa khoa Tỉnh',
    facilityType: FacilityType.PROVINCIAL_HOSPITAL,
    parentId: null,
    phoneNumber: '02812345678',
    address: '123 Đường Tỉnh',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    generateId: () => {},
    staffUsers: [],
    children: [],
  };

  const mockDistrictFacility: Facility = {
    id: 'district-222',
    facilityCode: 'TTYT-HUYEN-A',
    facilityName: 'Trung tâm Y tế Huyện A',
    facilityType: FacilityType.DISTRICT_HOSPITAL,
    parentId: 'provincial-111',
    phoneNumber: '02899998888',
    address: '456 Đường Huyện',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    generateId: () => {},
    staffUsers: [],
    children: [],
  };

  const mockRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FacilitiesService,
        {
          provide: getRepositoryToken(Facility),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<FacilitiesService>(FacilitiesService);
    jest.clearAllMocks();
  });

  describe('createFacility with hierarchy rules', () => {
    it('should allow Super Admin to create a top-level facility', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockParentFacility);
      mockRepository.save.mockResolvedValue(mockParentFacility);

      const result = await service.createFacility({
        facilityCode: 'BV-TINH-01',
        facilityName: 'Bệnh viện Đa khoa Tỉnh',
        facilityType: FacilityType.PROVINCIAL_HOSPITAL,
        address: '123 Đường Tỉnh',
      });

      expect(result).toEqual(mockParentFacility);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should allow VNDOCTOR_ADMIN to create a top-level facility or assign any parentId', async () => {
      const rootAdmin: StaffJwtPayload = {
        id: 'root-01',
        facilityId: undefined,
        staffCode: 'ROOT-001',
        username: 'vndoctor_admin',
        fullName: 'Quản trị viên Hệ thống VNDoctor',
        role: StaffRole.VNDOCTOR_ADMIN,
        type: 'STAFF',
      };

      mockRepository.findOne.mockResolvedValueOnce(null);
      mockRepository.create.mockReturnValue(mockParentFacility);
      mockRepository.save.mockResolvedValue(mockParentFacility);

      const result = await service.createFacility(
        {
          facilityCode: 'BV-TRUNGUONG-01',
          facilityName: 'Bệnh viện Bạch Mai (Trung ương)',
          facilityType: FacilityType.CENTRAL_HOSPITAL,
          address: '78 Giải Phóng, Hà Nội',
        },
        rootAdmin,
      );

      expect(result).toEqual(mockParentFacility);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          parentId: null,
        }),
      );
    });

    it('should automatically assign parentId when created by Facility Admin', async () => {
      const provincialAdmin: StaffJwtPayload = {
        id: 'admin-01',
        facilityId: 'provincial-111',
        staffCode: 'ADMIN-PROV',
        username: 'admin_prov',
        fullName: 'Admin Bệnh Viện Tỉnh',
        role: StaffRole.ADMIN,
        type: 'STAFF',
      };

      // Mock finding parent facility exists and is active
      mockRepository.findOne
        .mockResolvedValueOnce(null) // for duplicate facilityCode check
        .mockResolvedValueOnce(mockParentFacility); // for targetParentId existence check

      mockRepository.create.mockReturnValue(mockDistrictFacility);
      mockRepository.save.mockResolvedValue(mockDistrictFacility);

      const result = await service.createFacility(
        {
          facilityCode: 'TTYT-HUYEN-A',
          facilityName: 'Trung tâm Y tế Huyện A',
          facilityType: FacilityType.DISTRICT_HOSPITAL,
          address: '456 Đường Huyện',
        },
        provincialAdmin,
      );

      expect(result).toEqual(mockDistrictFacility);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          parentId: 'provincial-111',
        }),
      );
    });

    it('should throw Forbidden if Facility Admin attempts to create under another facilityId', async () => {
      const provincialAdmin: StaffJwtPayload = {
        id: 'admin-01',
        facilityId: 'provincial-111',
        staffCode: 'ADMIN-PROV',
        username: 'admin_prov',
        fullName: 'Admin Bệnh Viện Tỉnh',
        role: StaffRole.ADMIN,
        type: 'STAFF',
      };

      mockRepository.findOne.mockResolvedValueOnce(null);

      await expect(
        service.createFacility(
          {
            facilityCode: 'TTYT-HUYEN-B',
            facilityName: 'Trung tâm Y tế Huyện B',
            facilityType: FacilityType.DISTRICT_HOSPITAL,
            parentId: 'other-provincial-999',
            address: '456 Đường Huyện',
          },
          provincialAdmin,
        ),
      ).rejects.toThrow(Forbidden);
    });

    it('should throw Conflict when facilityCode already exists', async () => {
      mockRepository.findOne.mockResolvedValue(mockParentFacility);

      await expect(
        service.createFacility({
          facilityCode: 'BV-TINH-01',
          facilityName: 'Bệnh viện Đa khoa Tỉnh',
          address: '123 Đường Tỉnh',
        }),
      ).rejects.toThrow(Conflict);
    });
  });

  describe('getFacilityById', () => {
    it('should return facility with parent and children', async () => {
      mockRepository.findOne.mockResolvedValue(mockParentFacility);

      const result = await service.getFacilityById(mockParentFacility.id);
      expect(result).toEqual(mockParentFacility);
    });

    it('should throw NotFound when facility does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.getFacilityById('non-existent-id')).rejects.toThrow(
        NotFound,
      );
    });
  });

  describe('getChildrenFacilities', () => {
    it('should return child facilities for given parentId', async () => {
      mockRepository.findOne.mockResolvedValue(mockParentFacility);
      mockRepository.find.mockResolvedValue([mockDistrictFacility]);

      const children = await service.getChildrenFacilities('provincial-111');
      expect(children).toHaveLength(1);
      expect(children[0].id).toBe('district-222');
    });
  });
});
