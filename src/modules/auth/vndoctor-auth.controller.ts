import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { VnDoctorAuthService } from './vndoctor-auth.service';
import {
  AppAuthResponseDto,
  AppLoginDto,
  AppRegisterDto,
  RefreshTokenDto,
  StaffAuthResponseDto,
  StaffLoginDto,
  TokenRefreshResponseDto,
} from './dtos';
import { Doc } from '@/commons/docs/doc.decorator';
import { Public } from '@/commons/decorators/public.decorator';
import { StaffAuthGuard } from '@/commons/guards/staff-auth.guard';
import { AppAuthGuard } from '@/commons/guards/app-auth.guard';
import { CurrentStaff, StaffJwtPayload } from '@/commons/decorators/current-staff.decorator';
import { AppAccountJwtPayload, CurrentAccount } from '@/commons/decorators/current-account.decorator';
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

  @Public()
  @Post('app/register')
  @Doc({
    summary: 'Public - Đăng ký tài khoản Bệnh nhân (Mobile App)',
    description: 'Đăng ký tài khoản mới trên ứng dụng di động qua số điện thoại & mật khẩu',
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
}
