import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StaffService } from './staff.service';
import { StaffUser } from './entities/staff-user.entity';
import { FacilitiesService } from '@/modules/facilities/facilities.service';
import { StaffRole } from '@/commons/enums/vndoctor.enum';
import { Conflict, Forbidden, Unauthorized } from '@/commons/exceptions';
import type { StaffJwtPayload } from '@/commons/decorators/current-staff.decorator';
import * as bcrypt from 'bcryptjs';

describe('StaffService', () => {
  let service: StaffService;

  const mockFacility = {
    id: 'fac-111',
    facilityCode: 'FAC-01',
    facilityName: 'Bệnh viện TW',
    address: 'Hà Nội',
    isActive: true,
  };

  const mockStaff: StaffUser = {
    id: 'staff-111',
    facilityId: 'fac-111',
    facility: mockFacility as unknown as StaffUser['facility'],
    staffCode: 'CCHN-01',
    username: 'dr_an',
    passwordHash: '$2a$10$hashedpassword',
    fullName: 'BS. Nguyễn Văn An',
    role: StaffRole.DOCTOR,
    specialty: 'Tim mạch',
    email: 'dr.an@hospital.vn',
    phoneNumber: '0901234567',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    generateId: () => {},
  };

  const mockRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockFacilitiesService = {
    getFacilityById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StaffService,
        {
          provide: getRepositoryToken(StaffUser),
          useValue: mockRepository,
        },
        {
          provide: FacilitiesService,
          useValue: mockFacilitiesService,
        },
      ],
    }).compile();

    service = module.get<StaffService>(StaffService);
    jest.clearAllMocks();
  });

  describe('createStaff with default password and email requirement', () => {
    it('should create staff with default password vndoctor123 and auto username from email', async () => {
      mockFacilitiesService.getFacilityById.mockResolvedValue(mockFacility);
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue({ ...mockStaff });
      mockRepository.save.mockResolvedValue({ ...mockStaff });

      const result = await service.createStaff({
        facilityId: 'fac-111',
        staffCode: 'CCHN-01',
        fullName: 'BS. Nguyễn Văn An',
        email: 'dr.an@hospital.vn',
        role: StaffRole.DOCTOR,
      });

      expect(result.staffCode).toBe('CCHN-01');
      expect((result as unknown as Record<string, unknown>).passwordHash).toBeUndefined();
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          facilityId: 'fac-111',
          email: 'dr.an@hospital.vn',
          username: 'dr_an',
          role: StaffRole.DOCTOR,
        }),
      );
    });

    it('should enforce facilityId when created by FacilityAdmin', async () => {
      const facilityAdmin: StaffJwtPayload = {
        id: 'admin-1',
        facilityId: 'fac-111',
        staffCode: 'ADMIN-01',
        username: 'admin_fac',
        fullName: 'Facility Admin',
        role: StaffRole.ADMIN,
        type: 'STAFF',
      };

      mockFacilitiesService.getFacilityById.mockResolvedValue(mockFacility);
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue({ ...mockStaff });
      mockRepository.save.mockResolvedValue({ ...mockStaff });

      const result = await service.createStaff(
        {
          staffCode: 'CCHN-02',
          fullName: 'BS. Trần Văn B',
          email: 'dr.b@hospital.vn',
          role: StaffRole.DOCTOR,
        },
        facilityAdmin,
      );

      expect(result).toBeDefined();
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          facilityId: 'fac-111',
        }),
      );
    });

    it('should throw Forbidden if FacilityAdmin tries to create staff for another facilityId', async () => {
      const facilityAdmin: StaffJwtPayload = {
        id: 'admin-1',
        facilityId: 'fac-111',
        staffCode: 'ADMIN-01',
        username: 'admin_fac',
        fullName: 'Facility Admin',
        role: StaffRole.ADMIN,
        type: 'STAFF',
      };

      await expect(
        service.createStaff(
          {
            facilityId: 'other-fac-999',
            staffCode: 'CCHN-03',
            fullName: 'BS. Khác',
            email: 'dr.other@hospital.vn',
            role: StaffRole.DOCTOR,
          },
          facilityAdmin,
        ),
      ).rejects.toThrow(Forbidden);
    });

    it('should throw Conflict if email already exists', async () => {
      mockFacilitiesService.getFacilityById.mockResolvedValue(mockFacility);
      mockRepository.findOne
        .mockResolvedValueOnce(null) // staffCode check
        .mockResolvedValueOnce(mockStaff); // email check

      await expect(
        service.createStaff({
          facilityId: 'fac-111',
          staffCode: 'CCHN-NEW',
          fullName: 'BS. Mới',
          email: 'dr.an@hospital.vn',
          role: StaffRole.DOCTOR,
        }),
      ).rejects.toThrow(Conflict);
    });
  });

  describe('updateMyProfile', () => {
    it('should allow staff to update their personal info', async () => {
      mockRepository.findOne.mockResolvedValue({ ...mockStaff });
      mockRepository.save.mockImplementation((entity) => Promise.resolve(entity));

      const updated = await service.updateMyProfile('staff-111', {
        fullName: 'BS. CKII Nguyễn Văn An (Updated)',
        phoneNumber: '0988776655',
        specialty: 'Tim mạch can thiệp & Đột quỵ',
      });

      expect(updated.fullName).toBe('BS. CKII Nguyễn Văn An (Updated)');
      expect(updated.phoneNumber).toBe('0988776655');
      expect(updated.specialty).toBe('Tim mạch can thiệp & Đột quỵ');
    });
  });

  describe('changePassword', () => {
    it('should change password successfully when old password matches', async () => {
      const currentPasswordHash = await bcrypt.hash('vndoctor123', 10);
      const qb = {
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          ...mockStaff,
          passwordHash: currentPasswordHash,
        }),
      };
      mockRepository.createQueryBuilder.mockReturnValue(qb);
      mockRepository.save.mockResolvedValue(mockStaff);

      const result = await service.changePassword('staff-111', {
        oldPassword: 'vndoctor123',
        newPassword: 'MyNewSecretPass@2026',
      });

      expect(result.success).toBe(true);
    });

    it('should throw Unauthorized if old password does not match', async () => {
      const currentPasswordHash = await bcrypt.hash('vndoctor123', 10);
      const qb = {
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue({
          ...mockStaff,
          passwordHash: currentPasswordHash,
        }),
      };
      mockRepository.createQueryBuilder.mockReturnValue(qb);

      await expect(
        service.changePassword('staff-111', {
          oldPassword: 'WrongOldPassword',
          newPassword: 'NewPassword@123',
        }),
      ).rejects.toThrow(Unauthorized);
    });
  });
});
