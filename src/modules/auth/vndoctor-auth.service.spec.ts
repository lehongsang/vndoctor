import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { VnDoctorAuthService } from './vndoctor-auth.service';
import { StaffService } from '@/modules/staff/staff.service';
import { AccountsService } from '@/modules/accounts/accounts.service';
import { RedisService } from '@/services/redis/redis.service';
import { StaffRole } from '@/commons/enums/vndoctor.enum';
import { Forbidden, Unauthorized } from '@/commons/exceptions';

describe('VnDoctorAuthService', () => {
  let service: VnDoctorAuthService;

  const mockStaffService = {
    findByUsernameWithPassword: jest.fn(),
    getStaffById: jest.fn(),
  };

  const mockAccountsService = {
    register: jest.fn(),
    findByPhoneNumberWithPassword: jest.fn(),
    getAccountById: jest.fn(),
  };

  const mockRedisService = {
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'JWT_STAFF_SECRET') return 'test-staff-secret';
      if (key === 'JWT_APP_SECRET') return 'test-app-secret';
      if (key === 'JWT_STAFF_REFRESH_SECRET') return 'test-staff-refresh-secret';
      if (key === 'JWT_APP_REFRESH_SECRET') return 'test-app-refresh-secret';
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
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<VnDoctorAuthService>(VnDoctorAuthService);
    jest.clearAllMocks();
  });

  describe('loginStaff', () => {
    it('should login staff successfully with correct password and return access + refresh tokens', async () => {
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

      const result = await service.loginStaff({
        username: 'doc_test',
        password: 'CorrectPass@123',
      });

      expect(result.tokenType).toBe('Bearer');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.expiresIn).toBe(86400);
      expect(result.refreshTokenExpiresIn).toBe(2592000);
      expect(result.staff.username).toBe('doc_test');
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

    it('should throw Forbidden if staff is inactive', async () => {
      mockStaffService.findByUsernameWithPassword.mockResolvedValue({
        id: 'staff-1',
        username: 'doc_test',
        isActive: false,
        passwordHash: 'some-hash',
      });

      await expect(
        service.loginStaff({
          username: 'doc_test',
          password: 'CorrectPass@123',
        }),
      ).rejects.toThrow(Forbidden);
    });
  });

  describe('refreshStaffToken', () => {
    it('should refresh staff token successfully', async () => {
      const validRefreshToken = jwt.sign(
        { id: 'staff-1', type: 'STAFF_REFRESH' },
        'test-staff-refresh-secret',
        { expiresIn: 3600 },
      );

      mockRedisService.get.mockResolvedValue(null);
      mockStaffService.getStaffById.mockResolvedValue({
        id: 'staff-1',
        facilityId: 'fac-1',
        staffCode: 'CCHN-01',
        username: 'doc_test',
        fullName: 'BS. Test',
        role: StaffRole.DOCTOR,
        isActive: true,
      });

      const result = await service.refreshStaffToken({
        refreshToken: validRefreshToken,
      });

      expect(result.tokenType).toBe('Bearer');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw Unauthorized if refresh token is blacklisted', async () => {
      mockRedisService.get.mockResolvedValue('blacklisted');

      await expect(
        service.refreshStaffToken({ refreshToken: 'some-token' }),
      ).rejects.toThrow(Unauthorized);
    });

    it('should throw Unauthorized if token is invalid or expired', async () => {
      mockRedisService.get.mockResolvedValue(null);
      await expect(
        service.refreshStaffToken({ refreshToken: 'invalid.token.here' }),
      ).rejects.toThrow(Unauthorized);
    });

    it('should throw Forbidden if staff account is inactive', async () => {
      mockRedisService.get.mockResolvedValue(null);
      const validRefreshToken = jwt.sign(
        { id: 'staff-1', type: 'STAFF_REFRESH' },
        'test-staff-refresh-secret',
        { expiresIn: 3600 },
      );

      mockStaffService.getStaffById.mockResolvedValue({
        id: 'staff-1',
        isActive: false,
      });

      await expect(
        service.refreshStaffToken({ refreshToken: validRefreshToken }),
      ).rejects.toThrow(Forbidden);
    });
  });

  describe('registerApp', () => {
    it('should register patient account and return token pair', async () => {
      mockAccountsService.register.mockResolvedValue({
        id: 'acc-1',
        phoneNumber: '0987654321',
        email: 'patient@test.com',
        isActive: true,
      });

      const result = await service.registerApp({
        phoneNumber: '0987654321',
        password: 'PatientPass@123',
        email: 'patient@test.com',
      });

      expect(result.tokenType).toBe('Bearer');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.account.phoneNumber).toBe('0987654321');
    });
  });

  describe('loginApp', () => {
    it('should login app account successfully and return token pair', async () => {
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
      expect(result.refreshToken).toBeDefined();
      expect(result.account.phoneNumber).toBe('0987654321');
    });

    it('should throw Forbidden if patient account is inactive', async () => {
      mockAccountsService.findByPhoneNumberWithPassword.mockResolvedValue({
        id: 'acc-1',
        phoneNumber: '0987654321',
        isActive: false,
      });

      await expect(
        service.loginApp({
          phoneNumber: '0987654321',
          password: 'Pass',
        }),
      ).rejects.toThrow(Forbidden);
    });
  });

  describe('refreshAppToken', () => {
    it('should refresh app token successfully', async () => {
      const validRefreshToken = jwt.sign(
        { id: 'acc-1', type: 'APP_REFRESH' },
        'test-app-refresh-secret',
        { expiresIn: 3600 },
      );

      mockRedisService.get.mockResolvedValue(null);
      mockAccountsService.getAccountById.mockResolvedValue({
        id: 'acc-1',
        phoneNumber: '0987654321',
        email: 'patient@test.com',
        isActive: true,
      });

      const result = await service.refreshAppToken({
        refreshToken: validRefreshToken,
      });

      expect(result.tokenType).toBe('Bearer');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw Unauthorized if app refresh token is blacklisted', async () => {
      mockRedisService.get.mockResolvedValue('blacklisted');

      await expect(
        service.refreshAppToken({ refreshToken: 'some-token' }),
      ).rejects.toThrow(Unauthorized);
    });

    it('should throw Unauthorized if app token has wrong type', async () => {
      mockRedisService.get.mockResolvedValue(null);
      const staffRefreshToken = jwt.sign(
        { id: 'acc-1', type: 'STAFF_REFRESH' },
        'test-app-refresh-secret',
        { expiresIn: 3600 },
      );

      await expect(
        service.refreshAppToken({ refreshToken: staffRefreshToken }),
      ).rejects.toThrow(Unauthorized);
    });
  });

  describe('logout & blacklist', () => {
    it('should blacklist access token and refresh token in Redis on logout', async () => {
      const accessToken = jwt.sign(
        { id: 'staff-1', type: 'STAFF' },
        'test-secret',
        { expiresIn: 3600 },
      );
      const refreshToken = jwt.sign(
        { id: 'staff-1', type: 'STAFF_REFRESH' },
        'test-secret',
        { expiresIn: 7200 },
      );

      const result = await service.logout(accessToken, refreshToken);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Đăng xuất thành công');
      expect(mockRedisService.setex).toHaveBeenCalledTimes(2);
    });

    it('should blacklist only access token if refresh token is omitted', async () => {
      const accessToken = jwt.sign(
        { id: 'acc-1', type: 'APP_ACCOUNT' },
        'test-secret',
        { expiresIn: 3600 },
      );

      const result = await service.logout(accessToken);

      expect(result.success).toBe(true);
      expect(mockRedisService.setex).toHaveBeenCalledTimes(1);
    });

    it('should return true for blacklisted token and false otherwise', async () => {
      mockRedisService.get.mockResolvedValueOnce('blacklisted').mockResolvedValueOnce(null);

      const isBlacklisted1 = await service.isTokenBlacklisted('blacklisted-token');
      const isBlacklisted2 = await service.isTokenBlacklisted('clean-token');

      expect(isBlacklisted1).toBe(true);
      expect(isBlacklisted2).toBe(false);
    });
  });
});

