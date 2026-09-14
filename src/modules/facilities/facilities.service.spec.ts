import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { FacilitiesService } from './facilities.service';
import { Facility } from './entities/facility.entity';
import { FacilityType, StaffRole } from '@/commons/enums/vndoctor.enum';
import { BadRequest, Conflict, Forbidden, NotFound } from '@/commons/exceptions';
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
    count: jest.fn(),
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
          facilityCode: expect.stringMatching(/^FAC-\d{8}-[A-Z0-9]+$/),
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
          facilityCode: expect.stringMatching(/^FAC-\d{8}-[A-Z0-9]+$/),
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
            facilityName: 'Trung tâm Y tế Huyện B',
            facilityType: FacilityType.DISTRICT_HOSPITAL,
            parentId: 'other-provincial-999',
            address: '456 Đường Huyện',
          },
          provincialAdmin,
        ),
      ).rejects.toThrow(Forbidden);
    });

    it('should throw Conflict when auto-generated facilityCode conflicts persist', async () => {
      mockRepository.findOne.mockResolvedValue(mockParentFacility);

      await expect(
        service.createFacility({
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
    it('should return paginated child facilities for given parentId', async () => {
      mockRepository.findOne.mockResolvedValue(mockParentFacility);
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoinAndMapOne: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockDistrictFacility], 1]),
      };
      mockRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getChildrenFacilities('provincial-111', {
        search: 'Huyện A',
        facilityType: FacilityType.DISTRICT_HOSPITAL,
      });
      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('district-222');
      expect(result.total).toBe(1);
    });
  });

  describe('isSubordinateFacility', () => {
    it('should return true if facilityId is equal to parentFacilityId', async () => {
      const result = await service.isSubordinateFacility('fac-1', 'fac-1');
      expect(result).toBe(true);
    });

    it('should return true for a direct child facility', async () => {
      mockRepository.findOne.mockResolvedValueOnce({
        id: 'child-1',
        parentId: 'parent-1',
      });

      const result = await service.isSubordinateFacility('child-1', 'parent-1');
      expect(result).toBe(true);
    });

    it('should return true for a grandchild facility (nested hierarchy)', async () => {
      mockRepository.findOne
        .mockResolvedValueOnce({
          id: 'grandchild-1',
          parentId: 'child-1',
        })
        .mockResolvedValueOnce({
          id: 'child-1',
          parentId: 'root-1',
        });

      const result = await service.isSubordinateFacility('grandchild-1', 'root-1');
      expect(result).toBe(true);
    });

    it('should return false for unrelated facilities', async () => {
      mockRepository.findOne.mockResolvedValueOnce({
        id: 'other-facility',
        parentId: null,
      });

      const result = await service.isSubordinateFacility('other-facility', 'parent-1');
      expect(result).toBe(false);
    });

    it('should return false if facilityId or parentFacilityId is missing', async () => {
      expect(await service.isSubordinateFacility('', 'parent-1')).toBe(false);
      expect(await service.isSubordinateFacility('child-1', '')).toBe(false);
    });
  });

  describe('softDeleteFacility', () => {
    const rootAdmin: StaffJwtPayload = {
      id: 'root-01',
      staffCode: 'ROOT-001',
      username: 'vndoctor_admin',
      fullName: 'Quản trị viên Hệ thống VNDoctor',
      role: StaffRole.VNDOCTOR_ADMIN,
      type: 'STAFF',
    };

    const facilityAdmin: StaffJwtPayload = {
      id: 'staff-admin-01',
      facilityId: 'provincial-111',
      staffCode: 'ADMIN-001',
      username: 'provincial_admin',
      fullName: 'Quản lý BV Tỉnh',
      role: StaffRole.ADMIN,
      type: 'STAFF',
    };

    it('should allow VNDOCTOR_ADMIN to soft delete any facility', async () => {
      const facilityToDelete = { ...mockDistrictFacility, isActive: true };
      mockRepository.findOne.mockResolvedValueOnce(facilityToDelete);
      mockRepository.count.mockResolvedValueOnce(0);
      mockRepository.save.mockImplementationOnce((fac) => Promise.resolve(fac));

      const result = await service.softDeleteFacility('district-222', rootAdmin);

      expect(result).toEqual({
        success: true,
        message: 'Facility deactivated successfully',
      });
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'district-222', isActive: false }),
      );
    });

    it('should allow Facility Admin to soft delete a subordinate facility', async () => {
      const facilityToDelete = { ...mockDistrictFacility, isActive: true };
      mockRepository.findOne
        .mockResolvedValueOnce(facilityToDelete) // getFacilityById
        .mockResolvedValueOnce({ id: 'district-222', parentId: 'provincial-111' }); // isSubordinateFacility
      mockRepository.count.mockResolvedValueOnce(0);
      mockRepository.save.mockImplementationOnce((fac) => Promise.resolve(fac));

      const result = await service.softDeleteFacility('district-222', facilityAdmin);

      expect(result).toEqual({
        success: true,
        message: 'Facility deactivated successfully',
      });
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'district-222', isActive: false }),
      );
    });

    it('should throw Forbidden if Facility Admin attempts to delete their own facility', async () => {
      const selfFacility = { ...mockParentFacility, isActive: true };
      mockRepository.findOne.mockResolvedValueOnce(selfFacility);

      await expect(
        service.softDeleteFacility('provincial-111', facilityAdmin),
      ).rejects.toThrow(Forbidden);
    });

    it('should throw Forbidden if Facility Admin attempts to delete an unrelated facility', async () => {
      const unrelatedFacility = {
        ...mockDistrictFacility,
        id: 'unrelated-999',
        parentId: 'other-root-888',
      };
      mockRepository.findOne
        .mockResolvedValueOnce(unrelatedFacility) // getFacilityById
        .mockResolvedValueOnce({ id: 'unrelated-999', parentId: 'other-root-888' }) // isSubordinateFacility step 1
        .mockResolvedValueOnce({ id: 'other-root-888', parentId: null }); // isSubordinateFacility step 2

      await expect(
        service.softDeleteFacility('unrelated-999', facilityAdmin),
      ).rejects.toThrow(Forbidden);
    });

    it('should throw BadRequest if facility has active child facilities', async () => {
      const facilityWithChildren = { ...mockParentFacility, isActive: true };
      mockRepository.findOne.mockResolvedValueOnce(facilityWithChildren);
      mockRepository.count.mockResolvedValueOnce(2); // 2 active child facilities

      await expect(
        service.softDeleteFacility('provincial-111', rootAdmin),
      ).rejects.toThrow(BadRequest);
    });

    it('should throw NotFound if facility does not exist', async () => {
      mockRepository.findOne.mockResolvedValueOnce(null);

      await expect(
        service.softDeleteFacility('non-existent-id', rootAdmin),
      ).rejects.toThrow(NotFound);
    });
  });
});

