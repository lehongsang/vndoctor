import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { StaffService } from '@/modules/staff/staff.service';
import { AccountsService } from '@/modules/accounts/accounts.service';
import { RedisService } from '@/services/redis/redis.service';
import { SmsService } from '@/services/sms/sms.service';
import { generate6DigitOtp } from '@/utils/otp.util';
import {
  getAppOtpAttemptsKey,
  getAppOtpCooldownKey,
  getAppOtpKey,
  getBlacklistTokenKey,
} from '@/utils/key-redis';
import {
  AppAuthResponseDto,
  AppLoginDto,
  AppRegisterDto,
  LogoutResponseDto,
  OtpPurpose,
  RefreshTokenDto,
  SendOtpDto,
  SendOtpResponseDto,
  StaffAuthResponseDto,
  StaffLoginDto,
  TokenRefreshResponseDto,
  VerifyOtpDto,
  VerifyOtpResponseDto,
} from './dtos';
import {
  BadRequest,
  Conflict,
  Forbidden,
  NotFound,
  Unauthorized,
  ErrorCode,
} from '@/commons/exceptions';
import { StaffJwtPayload } from '@/commons/decorators/current-staff.decorator';
import { AppAccountJwtPayload } from '@/commons/decorators/current-account.decorator';

interface RefreshTokenPayload {
  id: string;
  type: 'STAFF_REFRESH' | 'APP_REFRESH';
  exp?: number;
}

interface OtpVerificationPayload {
  phoneNumber: string;
  purpose: OtpPurpose;
  type: 'OTP_VERIFICATION';
  exp?: number;
}

interface JwtBasePayload {
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

@Injectable()
export class VnDoctorAuthService {
  private readonly staffSecret: string;
  private readonly appSecret: string;
  private readonly staffRefreshSecret: string;
  private readonly appRefreshSecret: string;

  private readonly staffExpiresInSeconds = 86400; // 24 hours
  private readonly staffRefreshExpiresInSeconds = 2592000; // 30 days

  private readonly appExpiresInSeconds = 86400; // 24 hours
  private readonly appRefreshExpiresInSeconds = 2592000; // 30 days
  private readonly verificationTokenExpiresInSeconds = 600; // 10 minutes

  constructor(
    private readonly staffService: StaffService,
    private readonly accountsService: AccountsService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly smsService: SmsService,
  ) {
    const baseSecret =
      this.configService.get<string>('JWT_SECRET') ||
      'vndoctor-super-secret-key-2026';

    this.staffSecret =
      this.configService.get<string>('JWT_STAFF_SECRET') ||
      baseSecret;

    this.appSecret =
      this.configService.get<string>('JWT_APP_SECRET') ||
      baseSecret;

    this.staffRefreshSecret =
      this.configService.get<string>('JWT_STAFF_REFRESH_SECRET') ||
      `${this.staffSecret}-refresh`;

    this.appRefreshSecret =
      this.configService.get<string>('JWT_APP_REFRESH_SECRET') ||
      `${this.appSecret}-refresh`;
  }

  /**
   * Authenticates Medical Staff / Doctor on CMS and generates Access & Refresh token pair.
   *
   * @param dto - Username and password credentials.
   * @returns JWT Bearer token pair and staff profile.
   */
  async loginStaff(dto: StaffLoginDto): Promise<StaffAuthResponseDto> {
    const staff = await this.staffService.findByUsernameWithPassword(dto.username);
    if (!staff) {
      throw new Unauthorized(ErrorCode.INVALID_CREDENTIALS);
    }

    if (!staff.isActive) {
      throw new Forbidden(ErrorCode.STAFF_INACTIVE);
    }

    const isMatch = await bcrypt.compare(dto.password, staff.passwordHash);
    if (!isMatch) {
      throw new Unauthorized(ErrorCode.INVALID_CREDENTIALS);
    }

    const payload: StaffJwtPayload = {
      id: staff.id,
      facilityId: staff.facilityId ?? undefined,
      staffCode: staff.staffCode,
      username: staff.username,
      fullName: staff.fullName,
      role: staff.role,
      type: 'STAFF',
    };

    const accessToken = jwt.sign(payload, this.staffSecret, {
      expiresIn: this.staffExpiresInSeconds,
    });

    const refreshPayload: RefreshTokenPayload = {
      id: staff.id,
      type: 'STAFF_REFRESH',
    };

    const refreshToken = jwt.sign(refreshPayload, this.staffRefreshSecret, {
      expiresIn: this.staffRefreshExpiresInSeconds,
    });

    const staffProfile = { ...staff };
    delete (staffProfile as Partial<typeof staff>).passwordHash;

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.staffExpiresInSeconds,
      refreshTokenExpiresIn: this.staffRefreshExpiresInSeconds,
      staff: staffProfile,
    };
  }

  /**
   * Refreshes expired Access Token for Staff using valid Refresh Token.
   *
   * @param dto - RefreshTokenDto
   * @returns New Token pair
   */
  async refreshStaffToken(dto: RefreshTokenDto): Promise<TokenRefreshResponseDto> {
    if (await this.isTokenBlacklisted(dto.refreshToken)) {
      throw new Unauthorized(ErrorCode.REFRESH_TOKEN_BLACKLISTED);
    }

    let decoded: RefreshTokenPayload;
    try {
      decoded = jwt.verify(
        dto.refreshToken,
        this.staffRefreshSecret,
      ) as RefreshTokenPayload;
    } catch {
      throw new Unauthorized(ErrorCode.REFRESH_TOKEN_INVALID);
    }

    if (decoded.type !== 'STAFF_REFRESH' || !decoded.id) {
      throw new Unauthorized(ErrorCode.TOKEN_AUDIENCE_MISMATCH);
    }

    const staff = await this.staffService.getStaffById(decoded.id);
    if (!staff || !staff.isActive) {
      throw new Forbidden(ErrorCode.STAFF_INACTIVE);
    }

    const payload: StaffJwtPayload = {
      id: staff.id,
      facilityId: staff.facilityId ?? undefined,
      staffCode: staff.staffCode,
      username: staff.username,
      fullName: staff.fullName,
      role: staff.role,
      type: 'STAFF',
    };

    const accessToken = jwt.sign(payload, this.staffSecret, {
      expiresIn: this.staffExpiresInSeconds,
    });

    const refreshPayload: RefreshTokenPayload = {
      id: staff.id,
      type: 'STAFF_REFRESH',
    };

    const newRefreshToken = jwt.sign(refreshPayload, this.staffRefreshSecret, {
      expiresIn: this.staffRefreshExpiresInSeconds,
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
      tokenType: 'Bearer',
      expiresIn: this.staffExpiresInSeconds,
      refreshTokenExpiresIn: this.staffRefreshExpiresInSeconds,
    };
  }

  /**
   * Generates and dispatches a 6-digit OTP code to the requested mobile phone.
   * Enforces 60-second cooldown rate limit and purpose-specific validations.
   *
   * @param dto - Target phone number and OTP purpose.
   * @returns Delivery status with TTL and retry cooldown details.
   */
  async sendAppOtp(dto: SendOtpDto): Promise<SendOtpResponseDto> {
    const phoneNumber = dto.phoneNumber.trim();
    const cooldownKey = getAppOtpCooldownKey(dto.type, phoneNumber);

    // 1. Check rate limit cooldown
    const isCooldownActive = await this.redisService.get(cooldownKey);
    if (isCooldownActive) {
      throw new BadRequest(ErrorCode.OTP_COOLDOWN_ACTIVE);
    }

    // 2. Validate purpose specific constraints
    if (dto.type === OtpPurpose.REGISTER) {
      const existing = await this.accountsService.findByPhoneNumberWithPassword(phoneNumber);
      if (existing) {
        throw new Conflict(ErrorCode.ACCOUNT_PHONE_ALREADY_EXISTS);
      }
    } else if (dto.type === OtpPurpose.FORGOT_PASSWORD) {
      const existing = await this.accountsService.findByPhoneNumberWithPassword(phoneNumber);
      if (!existing) {
        throw new NotFound(ErrorCode.ACCOUNT_NOT_FOUND);
      }
    }

    // 3. Generate secure 6-digit OTP
    const otp = generate6DigitOtp();
    const otpTtl = 300; // 5 minutes
    const cooldownTtl = 60; // 60 seconds

    const otpKey = getAppOtpKey(dto.type, phoneNumber);
    const attemptsKey = getAppOtpAttemptsKey(dto.type, phoneNumber);

    // 4. Save to Redis
    await this.redisService.setex(otpKey, otpTtl, otp);
    await this.redisService.setex(attemptsKey, otpTtl, '0');
    await this.redisService.setex(cooldownKey, cooldownTtl, '1');

    // 5. Send via SMS gateway
    await this.smsService.sendOtp(phoneNumber, otp, Math.floor(otpTtl / 60));

    return {
      success: true,
      expiresInSeconds: otpTtl,
      retryAfterSeconds: cooldownTtl,
    };
  }

  /**
   * Verifies an OTP code and issues a temporary signed Verification Token.
   * Prevents brute-force attempts (locks after 5 failed tries).
   *
   * @param dto - Target phone, input OTP code, and purpose.
   * @returns Verification token valid for 10 minutes.
   */
  async verifyAppOtp(dto: VerifyOtpDto): Promise<VerifyOtpResponseDto> {
    const phoneNumber = dto.phoneNumber.trim();
    const otpKey = getAppOtpKey(dto.type, phoneNumber);
    const attemptsKey = getAppOtpAttemptsKey(dto.type, phoneNumber);

    const storedOtp = await this.redisService.get(otpKey);
    if (!storedOtp) {
      throw new BadRequest(ErrorCode.OTP_EXPIRED);
    }

    const attemptsStr = await this.redisService.get(attemptsKey);
    const attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;

    if (attempts >= 5) {
      await this.redisService.del(otpKey);
      await this.redisService.del(attemptsKey);
      throw new BadRequest(ErrorCode.OTP_MAX_ATTEMPTS_EXCEEDED);
    }

    if (storedOtp !== dto.otp.trim()) {
      await this.redisService.setex(attemptsKey, 300, String(attempts + 1));
      throw new BadRequest(ErrorCode.OTP_INVALID);
    }

    // Verification successful -> Invalidate OTP
    await this.redisService.del(otpKey);
    await this.redisService.del(attemptsKey);

    // Issue signed verification token
    const payload: OtpVerificationPayload = {
      phoneNumber,
      purpose: dto.type,
      type: 'OTP_VERIFICATION',
    };

    const verificationToken = jwt.sign(payload, this.appSecret, {
      expiresIn: this.verificationTokenExpiresInSeconds,
    });

    return {
      success: true,
      verificationToken,
      expiresInSeconds: this.verificationTokenExpiresInSeconds,
    };
  }

  /**
   * Registers a new patient account via mobile app and generates Access & Refresh tokens.
   * Supports registration via verified token or direct phone number.
   *
   * @param dto - Verification token or mobile phone, password, email.
   * @returns JWT Bearer token pair and account profile.
   */
  async registerApp(dto: AppRegisterDto): Promise<AppAuthResponseDto> {
    let targetPhone = dto.phoneNumber?.trim();

    if (dto.verificationToken) {
      try {
        const decoded = jwt.verify(dto.verificationToken, this.appSecret) as OtpVerificationPayload;
        if (decoded.type !== 'OTP_VERIFICATION' || decoded.purpose !== OtpPurpose.REGISTER) {
          throw new BadRequest(ErrorCode.VERIFICATION_TOKEN_INVALID);
        }
        targetPhone = decoded.phoneNumber;
      } catch (err) {
        if (err instanceof BadRequest) {
          throw err;
        }
        throw new BadRequest(ErrorCode.VERIFICATION_TOKEN_INVALID);
      }
    }

    if (!targetPhone) {
      throw new BadRequest(ErrorCode.MISSING_REQUIRED_FIELD);
    }

    const account = await this.accountsService.register({
      phoneNumber: targetPhone,
      password: dto.password,
      email: dto.email,
    });

    const payload: AppAccountJwtPayload = {
      id: account.id,
      phoneNumber: account.phoneNumber,
      email: account.email,
      type: 'APP_ACCOUNT',
    };

    const accessToken = jwt.sign(payload, this.appSecret, {
      expiresIn: this.appExpiresInSeconds,
    });

    const refreshPayload: RefreshTokenPayload = {
      id: account.id,
      type: 'APP_REFRESH',
    };

    const refreshToken = jwt.sign(refreshPayload, this.appRefreshSecret, {
      expiresIn: this.appRefreshExpiresInSeconds,
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.appExpiresInSeconds,
      refreshTokenExpiresIn: this.appRefreshExpiresInSeconds,
      account,
    };
  }

  /**
   * Authenticates Patient on Mobile App and generates Access & Refresh token pair.
   *
   * @param dto - Mobile phone and password.
   * @returns JWT Bearer token pair and account profile.
   */
  async loginApp(dto: AppLoginDto): Promise<AppAuthResponseDto> {
    const account = await this.accountsService.findByPhoneNumberWithPassword(dto.phoneNumber);
    if (!account) {
      throw new Unauthorized(ErrorCode.INVALID_CREDENTIALS);
    }

    if (!account.isActive) {
      throw new Forbidden(ErrorCode.ACCOUNT_INACTIVE);
    }

    const isMatch = await bcrypt.compare(dto.password, account.passwordHash);
    if (!isMatch) {
      throw new Unauthorized(ErrorCode.INVALID_CREDENTIALS);
    }

    const payload: AppAccountJwtPayload = {
      id: account.id,
      phoneNumber: account.phoneNumber,
      email: account.email,
      type: 'APP_ACCOUNT',
    };

    const accessToken = jwt.sign(payload, this.appSecret, {
      expiresIn: this.appExpiresInSeconds,
    });

    const refreshPayload: RefreshTokenPayload = {
      id: account.id,
      type: 'APP_REFRESH',
    };

    const refreshToken = jwt.sign(refreshPayload, this.appRefreshSecret, {
      expiresIn: this.appRefreshExpiresInSeconds,
    });

    const accountProfile = { ...account };
    delete (accountProfile as Partial<typeof account>).passwordHash;

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: this.appExpiresInSeconds,
      refreshTokenExpiresIn: this.appRefreshExpiresInSeconds,
      account: accountProfile,
    };
  }

  /**
   * Refreshes expired Access Token for Patient App using valid Refresh Token.
   *
   * @param dto - RefreshTokenDto
   * @returns New Token pair
   */
  async refreshAppToken(dto: RefreshTokenDto): Promise<TokenRefreshResponseDto> {
    if (await this.isTokenBlacklisted(dto.refreshToken)) {
      throw new Unauthorized(ErrorCode.REFRESH_TOKEN_BLACKLISTED);
    }

    let decoded: RefreshTokenPayload;
    try {
      decoded = jwt.verify(
        dto.refreshToken,
        this.appRefreshSecret,
      ) as RefreshTokenPayload;
    } catch {
      throw new Unauthorized(ErrorCode.REFRESH_TOKEN_INVALID);
    }

    if (decoded.type !== 'APP_REFRESH' || !decoded.id) {
      throw new Unauthorized(ErrorCode.TOKEN_AUDIENCE_MISMATCH);
    }

    const account = await this.accountsService.getAccountById(decoded.id);
    if (!account || !account.isActive) {
      throw new Forbidden(ErrorCode.ACCOUNT_INACTIVE);
    }

    const payload: AppAccountJwtPayload = {
      id: account.id,
      phoneNumber: account.phoneNumber,
      email: account.email,
      type: 'APP_ACCOUNT',
    };

    const accessToken = jwt.sign(payload, this.appSecret, {
      expiresIn: this.appExpiresInSeconds,
    });

    const refreshPayload: RefreshTokenPayload = {
      id: account.id,
      type: 'APP_REFRESH',
    };

    const newRefreshToken = jwt.sign(refreshPayload, this.appRefreshSecret, {
      expiresIn: this.appRefreshExpiresInSeconds,
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
      tokenType: 'Bearer',
      expiresIn: this.appExpiresInSeconds,
      refreshTokenExpiresIn: this.appRefreshExpiresInSeconds,
    };
  }


  /**
   * Checks whether a JWT token is in the Redis blacklist.
   *
   * @param token - JWT access token or refresh token
   * @returns boolean true if token is blacklisted
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    if (!token) return false;
    const key = getBlacklistTokenKey(token);
    const value = await this.redisService.get(key);
    return value !== null;
  }

  /**
   * Invalidates active Access Token and optional Refresh Token by adding them to Redis Blacklist.
   *
   * @param accessToken - Raw JWT Access Token from Authorization Header
   * @param refreshToken - Optional Refresh Token to revoke
   * @returns Logout confirmation response
   */
  async logout(accessToken: string, refreshToken?: string): Promise<LogoutResponseDto> {
    const nowInSeconds = Math.floor(Date.now() / 1000);

    // 1. Blacklist Access Token
    if (accessToken) {
      const decodedAccess = jwt.decode(accessToken) as JwtBasePayload | null;
      const accessRemaining = decodedAccess?.exp
        ? Math.max(1, decodedAccess.exp - nowInSeconds)
        : this.staffExpiresInSeconds;

      const accessKey = getBlacklistTokenKey(accessToken);
      await this.redisService.setex(accessKey, accessRemaining, 'blacklisted');
    }

    // 2. Blacklist Refresh Token if provided
    if (refreshToken) {
      const decodedRefresh = jwt.decode(refreshToken) as JwtBasePayload | null;
      const refreshRemaining = decodedRefresh?.exp
        ? Math.max(1, decodedRefresh.exp - nowInSeconds)
        : this.staffRefreshExpiresInSeconds;

      const refreshKey = getBlacklistTokenKey(refreshToken);
      await this.redisService.setex(refreshKey, refreshRemaining, 'blacklisted');
    }

    return {
      success: true,
      message: 'Đăng xuất thành công',
    };
  }
}

