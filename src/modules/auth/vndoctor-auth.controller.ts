import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { VnDoctorAuthService } from './vndoctor-auth.service';
import {
  AppAuthResponseDto,
  AppLoginDto,
  AppRegisterDto,
  LogoutDto,
  LogoutResponseDto,
  RefreshTokenDto,
  SendOtpDto,
  SendOtpResponseDto,
  StaffAuthResponseDto,
  StaffLoginDto,
  TokenRefreshResponseDto,
  VerifyOtpDto,
  VerifyOtpResponseDto,
} from './dtos';
import { Doc } from '@/commons/docs/doc.decorator';
import { Public } from '@/commons/decorators/public.decorator';
import { StaffAuthGuard } from '@/commons/guards/staff-auth.guard';
import { AppAuthGuard } from '@/commons/guards/app-auth.guard';
import { CurrentStaff, StaffJwtPayload } from '@/commons/decorators/current-staff.decorator';
import { AppAccountJwtPayload, CurrentAccount } from '@/commons/decorators/current-account.decorator';
import { RawToken } from '@/commons/decorators/raw-token.decorator';
import { StaffService } from '@/modules/staff/staff.service';
import { AccountsService } from '@/modules/accounts/accounts.service';

@ApiTags('Authentication (Xác thực CMS & App)')
@Controller('auth')
export class VnDoctorAuthController {
  constructor(
    private readonly authService: VnDoctorAuthService,
    private readonly staffService: StaffService,
    private readonly accountsService: AccountsService,
  ) {}

  @Public()
  @Post('staff/login')
  @Doc({
    summary: 'Public - Đăng nhập Nhân viên y tế / Bác sĩ (Web CMS)',
    description: 'Xác thực tài khoản nhân viên y tế qua username & password, trả về Access Token & Refresh Token',
    response: { serialization: StaffAuthResponseDto },
  })
  async loginStaff(@Body() dto: StaffLoginDto): Promise<StaffAuthResponseDto> {
    return this.authService.loginStaff(dto);
  }

  @Public()
  @Post('staff/refresh')
  @Doc({
    summary: 'Public - Làm mới Access Token cho Staff / Bác sĩ',
    description: 'Sử dụng Refresh Token hợp lệ của nhân sự y tế để lấy cặp Access Token & Refresh Token mới',
    response: { serialization: TokenRefreshResponseDto },
  })
  async refreshStaffToken(@Body() dto: RefreshTokenDto): Promise<TokenRefreshResponseDto> {
    return this.authService.refreshStaffToken(dto);
  }

  @Get('staff/me')
  @UseGuards(StaffAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Staff Auth - Lấy thông tin nhân viên đang đăng nhập',
    description: 'Trả về thông tin chi tiết của nhân sự y tế đang đăng nhập dựa trên JWT token',
  })
  async getStaffProfile(@CurrentStaff() staff: StaffJwtPayload) {
    return this.staffService.getStaffById(staff.id);
  }

  @Post('staff/logout')
  @UseGuards(StaffAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Staff Auth - Đăng xuất Nhân viên y tế / Bác sĩ (Web CMS)',
    description: 'Vô hiệu hóa Access Token và Refresh Token hiện tại trên toàn hệ thống thông qua Redis Blacklist',
    response: { serialization: LogoutResponseDto },
  })
  async logoutStaff(
    @RawToken() token: string,
    @Body() dto?: LogoutDto,
  ): Promise<LogoutResponseDto> {
    return this.authService.logout(token, dto?.refreshToken);
  }

  @Public()
  @Post('app/send-otp')
  @Doc({
    summary: 'Public - Gửi mã OTP SMS xác thực số điện thoại (Mobile App)',
    description: 'Tạo mã OTP 6 số ngẫu nhiên, lưu Redis (5 phút), áp dụng cooldown 60s và gửi qua SMS Brandname',
    response: { serialization: SendOtpResponseDto },
  })
  async sendAppOtp(@Body() dto: SendOtpDto): Promise<SendOtpResponseDto> {
    return this.authService.sendAppOtp(dto);
  }

  @Public()
  @Post('app/verify-otp')
  @Doc({
    summary: 'Public - Xác thực mã OTP SMS và nhận Verification Token (Mobile App)',
    description: 'Kiểm tra mã OTP (giới hạn 5 lần thử), nếu đúng trả về Verification Token có hạn 10 phút để đăng ký tài khoản',
    response: { serialization: VerifyOtpResponseDto },
  })
  async verifyAppOtp(@Body() dto: VerifyOtpDto): Promise<VerifyOtpResponseDto> {
    return this.authService.verifyAppOtp(dto);
  }

  @Public()
  @Post('app/register')
  @Doc({
    summary: 'Public - Đăng ký tài khoản Bệnh nhân (Mobile App)',
    description: 'Đăng ký tài khoản mới trên ứng dụng di động qua verificationToken hoặc số điện thoại & mật khẩu',
    response: { serialization: AppAuthResponseDto },
  })
  async registerApp(@Body() dto: AppRegisterDto): Promise<AppAuthResponseDto> {
    return this.authService.registerApp(dto);
  }

  @Public()
  @Post('app/login')
  @Doc({
    summary: 'Public - Đăng nhập Bệnh nhân (Mobile App)',
    description: 'Đăng nhập vào ứng dụng di động bệnh nhân qua số điện thoại & mật khẩu, trả về Access Token & Refresh Token',
    response: { serialization: AppAuthResponseDto },
  })
  async loginApp(@Body() dto: AppLoginDto): Promise<AppAuthResponseDto> {
    return this.authService.loginApp(dto);
  }

  @Public()
  @Post('app/refresh')
  @Doc({
    summary: 'Public - Làm mới Access Token cho Bệnh nhân App',
    description: 'Sử dụng Refresh Token hợp lệ của tài khoản bệnh nhân để lấy cặp Access Token & Refresh Token mới',
    response: { serialization: TokenRefreshResponseDto },
  })
  async refreshAppToken(@Body() dto: RefreshTokenDto): Promise<TokenRefreshResponseDto> {
    return this.authService.refreshAppToken(dto);
  }

  @Get('app/me')
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'App Auth - Lấy thông tin tài khoản bệnh nhân đang đăng nhập',
    description: 'Trả về thông tin tài khoản bệnh nhân và danh sách hồ sơ sức khỏe liên kết',
  })
  async getAppProfile(@CurrentAccount() account: AppAccountJwtPayload) {
    return this.accountsService.getAccountById(account.id);
  }

  @Post('app/logout')
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'App Auth - Đăng xuất Bệnh nhân (Mobile App)',
    description: 'Vô hiệu hóa Access Token và Refresh Token hiện tại trên toàn hệ thống thông qua Redis Blacklist',
    response: { serialization: LogoutResponseDto },
  })
  async logoutApp(
    @RawToken() token: string,
    @Body() dto?: LogoutDto,
  ): Promise<LogoutResponseDto> {
    return this.authService.logout(token, dto?.refreshToken);
  }
}

