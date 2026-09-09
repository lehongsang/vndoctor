import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { StaffService } from '@/modules/staff/staff.service';
import { AccountsService } from '@/modules/accounts/accounts.service';
import {
  AppAuthResponseDto,
  AppLoginDto,
  AppRegisterDto,
  RefreshTokenDto,
  StaffAuthResponseDto,
  StaffLoginDto,
  TokenRefreshResponseDto,
} from './dtos';
import {
  Forbidden,
  Unauthorized,
} from '@/commons/exceptions';
import { StaffJwtPayload } from '@/commons/decorators/current-staff.decorator';
import { AppAccountJwtPayload } from '@/commons/decorators/current-account.decorator';

interface RefreshTokenPayload {
  id: string;
  type: 'STAFF_REFRESH' | 'APP_REFRESH';
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

  constructor(
    private readonly staffService: StaffService,
    private readonly accountsService: AccountsService,
    private readonly configService: ConfigService,
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
      throw new Unauthorized('Tên đăng nhập hoặc mật khẩu không chính xác');
    }

    if (!staff.isActive) {
      throw new Forbidden('Tài khoản nhân viên này đang bị vô hiệu hóa');
    }

    const isMatch = await bcrypt.compare(dto.password, staff.passwordHash);
    if (!isMatch) {
      throw new Unauthorized('Tên đăng nhập hoặc mật khẩu không chính xác');
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
    let decoded: RefreshTokenPayload;
    try {
      decoded = jwt.verify(
        dto.refreshToken,
        this.staffRefreshSecret,
      ) as RefreshTokenPayload;
    } catch {
      throw new Unauthorized('Refresh token không hợp lệ hoặc đã hết hạn');
    }

    if (decoded.type !== 'STAFF_REFRESH' || !decoded.id) {
      throw new Unauthorized('Loại refresh token không hợp lệ cho nhân sự');
    }

    const staff = await this.staffService.getStaffById(decoded.id);
    if (!staff || !staff.isActive) {
      throw new Forbidden('Tài khoản nhân viên không tồn tại hoặc đã bị khóa');
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
   * Registers a new patient account via mobile app and generates Access & Refresh tokens.
   *
   * @param dto - Mobile phone, password, email.
   * @returns JWT Bearer token pair and account profile.
   */
  async registerApp(dto: AppRegisterDto): Promise<AppAuthResponseDto> {
    const account = await this.accountsService.register(dto);

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
      throw new Unauthorized('Số điện thoại hoặc mật khẩu không chính xác');
    }

    if (!account.isActive) {
      throw new Forbidden('Tài khoản bệnh nhân đang bị khóa');
    }

    const isMatch = await bcrypt.compare(dto.password, account.passwordHash);
    if (!isMatch) {
      throw new Unauthorized('Số điện thoại hoặc mật khẩu không chính xác');
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
    let decoded: RefreshTokenPayload;
    try {
      decoded = jwt.verify(
        dto.refreshToken,
        this.appRefreshSecret,
      ) as RefreshTokenPayload;
    } catch {
      throw new Unauthorized('Refresh token không hợp lệ hoặc đã hết hạn');
    }

    if (decoded.type !== 'APP_REFRESH' || !decoded.id) {
      throw new Unauthorized('Loại refresh token không hợp lệ cho bệnh nhân');
    }

    const account = await this.accountsService.getAccountById(decoded.id);
    if (!account || !account.isActive) {
      throw new Forbidden('Tài khoản bệnh nhân không tồn tại hoặc đã bị khóa');
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
}
