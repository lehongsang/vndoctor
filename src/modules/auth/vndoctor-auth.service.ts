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
  StaffAuthResponseDto,
  StaffLoginDto,
} from './dtos/vndoctor-auth.dto';
import {
  Forbidden,
  Unauthorized,
} from '@/commons/exceptions';
import { StaffJwtPayload } from '@/commons/decorators/current-staff.decorator';
import { AppAccountJwtPayload } from '@/commons/decorators/current-account.decorator';

@Injectable()
export class VnDoctorAuthService {
  private readonly staffSecret: string;
  private readonly appSecret: string;
  private readonly staffExpiresInSeconds = 86400; // 24 hours
  private readonly appExpiresInSeconds = 2592000; // 30 days

  constructor(
    private readonly staffService: StaffService,
    private readonly accountsService: AccountsService,
    private readonly configService: ConfigService,
  ) {
    this.staffSecret =
      this.configService.get<string>('JWT_STAFF_SECRET') ||
      this.configService.get<string>('JWT_SECRET') ||
      'vndoctor-staff-secret-key-2026';

    this.appSecret =
      this.configService.get<string>('JWT_APP_SECRET') ||
      this.configService.get<string>('JWT_SECRET') ||
      'vndoctor-app-secret-key-2026';
  }

  /**
   * Authenticates Medical Staff / Doctor on CMS.
   *
   * @param dto - Username and password credentials.
   * @returns JWT Bearer token and staff profile.
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
      facilityId: staff.facilityId,
      staffCode: staff.staffCode,
      username: staff.username,
      fullName: staff.fullName,
      role: staff.role,
      type: 'STAFF',
    };

    const accessToken = jwt.sign(payload, this.staffSecret, {
      expiresIn: this.staffExpiresInSeconds,
    });

    const staffProfile = { ...staff };
    delete (staffProfile as Partial<typeof staff>).passwordHash;

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.staffExpiresInSeconds,
      staff: staffProfile,
    };
  }

  /**
   * Registers a new patient account via mobile app.
   *
   * @param dto - Mobile phone, password, email.
   * @returns JWT Bearer token and account profile.
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

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.appExpiresInSeconds,
      account,
    };
  }

  /**
   * Authenticates Patient on Mobile App.
   *
   * @param dto - Mobile phone and password.
   * @returns JWT Bearer token and account profile.
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

    const accountProfile = { ...account };
    delete (accountProfile as Partial<typeof account>).passwordHash;

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.appExpiresInSeconds,
      account: accountProfile,
    };
  }
}
