import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { VnDoctorAuthService } from './vndoctor-auth.service';
import { StaffService } from '@/modules/staff/staff.service';
import { AccountsService } from '@/modules/accounts/accounts.service';
import { StaffRole } from '@/commons/enums/vndoctor.enum';
import { Unauthorized } from '@/commons/exceptions';
import * as bcrypt from 'bcryptjs';

describe('VnDoctorAuthService', () => {
  let service: VnDoctorAuthService;

  const mockStaffService = {
    findByUsernameWithPassword: jest.fn(),
  };

  const mockAccountsService = {
    register: jest.fn(),
    findByPhoneNumberWithPassword: jest.fn(),
    getAccountById: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'JWT_STAFF_SECRET') return 'test-staff-secret';
      if (key === 'JWT_APP_SECRET') return 'test-app-secret';
      return 'test-secret';
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VnDoctorAuthService,
        { provide: StaffService, useValue: mockStaffService },
        { provide: AccountsService, useValue: mockAccountsService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<VnDoctorAuthService>(VnDoctorAuthService);
    jest.clearAllMocks();
  });

  describe('loginStaff', () => {
    it('should login staff successfully with correct password', () => {
      const passwordHash = bcrypt.hashSync('CorrectPass@123', 4);
      mockStaffService.findByUsernameWithPassword.mockResolvedValue({
        id: 'staff-1',
        facilityId: 'fac-1',
        staffCode: 'CCHN-01',
        username: 'doc_test',
        fullName: 'BS. Test',
        role: StaffRole.DOCTOR,
        isActive: true,
        passwordHash,
      });

      return service.loginStaff({
        username: 'doc_test',
        password: 'CorrectPass@123',
      }).then((result) => {
        expect(result.tokenType).toBe('Bearer');
        expect(result.accessToken).toBeDefined();
        expect(result.staff.username).toBe('doc_test');
      });
    });

    it('should throw Unauthorized on wrong password', async () => {
      const passwordHash = bcrypt.hashSync('CorrectPass@123', 4);
      mockStaffService.findByUsernameWithPassword.mockResolvedValue({
        id: 'staff-1',
        username: 'doc_test',
        isActive: true,
        passwordHash,
      });

      await expect(
        service.loginStaff({
          username: 'doc_test',
          password: 'WrongPassword',
        }),
      ).rejects.toThrow(Unauthorized);
    });
  });

  describe('loginApp', () => {
    it('should login app account successfully', async () => {
      const passwordHash = bcrypt.hashSync('PatientPass@123', 4);
      mockAccountsService.findByPhoneNumberWithPassword.mockResolvedValue({
        id: 'acc-1',
        phoneNumber: '0987654321',
        email: 'patient@test.com',
        isActive: true,
        passwordHash,
      });

      const result = await service.loginApp({
        phoneNumber: '0987654321',
        password: 'PatientPass@123',
      });

      expect(result.tokenType).toBe('Bearer');
      expect(result.accessToken).toBeDefined();
      expect(result.account.phoneNumber).toBe('0987654321');
    });
  });
});
