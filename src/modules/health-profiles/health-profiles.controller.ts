import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { HealthProfilesService } from './health-profiles.service';
import {
  CreateFacilityHealthProfileDto,
  CreateHealthProfileDto,
  QueryHealthProfileDto,
  QueryProfileListDto,
  UpdateHealthProfileDto,
} from './dtos';
import { Doc } from '@/commons/docs/doc.decorator';
import { HealthProfile } from './entities/health-profile.entity';
import { AppAuthGuard } from '@/commons/guards/app-auth.guard';
import { StaffAuthGuard } from '@/commons/guards/staff-auth.guard';
import { StaffRolesGuard } from '@/commons/guards/staff-roles.guard';
import { CombinedAuthGuard } from '@/commons/guards/combined-auth.guard';
import { AppAccountJwtPayload, CurrentAccount } from '@/commons/decorators/current-account.decorator';
import { CurrentStaff, StaffJwtPayload } from '@/commons/decorators/current-staff.decorator';
import { AuthUserContext, CurrentAuthUser } from '@/commons/decorators/current-auth-user.decorator';
import { Public } from '@/commons/decorators/public.decorator';

@ApiTags('Health Profiles (Hồ sơ Sức khỏe Bệnh nhân)')
@Controller('health-profiles')
export class HealthProfilesController {
  constructor(
    private readonly healthProfilesService: HealthProfilesService,
  ) {}

  @Get()
  @UseGuards(StaffAuthGuard, StaffRolesGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Staff Auth - Lấy tất cả hồ sơ sức khỏe đã gắn với cơ sở y tế',
    description: 'Nhân viên y tế lấy danh sách các hồ sơ sức khỏe đã được liên kết vào cơ sở y tế của mình (Facility nào chỉ xem hồ sơ của Facility đó).',
    response: { serialization: HealthProfile, isArray: true },
  })
  async getFacilityProfiles(
    @Query() query: QueryHealthProfileDto,
    @CurrentStaff() staff: StaffJwtPayload,
  ) {
    return this.healthProfilesService.getFacilityProfiles(query, staff);
  }

  @Get('facility')
  @UseGuards(StaffAuthGuard, StaffRolesGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Staff Auth - Lấy danh sách hồ sơ sức khỏe tại cơ sở y tế (Alias)',
    description: 'Nhân viên y tế lấy danh sách các hồ sơ sức khỏe đã được liên kết vào cơ sở y tế của mình.',
    response: { serialization: HealthProfile, isArray: true },
  })
  async getFacilityProfilesAlias(
    @Query() query: QueryHealthProfileDto,
    @CurrentStaff() staff: StaffJwtPayload,
  ) {
    return this.healthProfilesService.getFacilityProfiles(query, staff);
  }

  @Get('profileList')
  @UseGuards(StaffAuthGuard, StaffRolesGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Staff/Doctor Auth - Danh sách hồ sơ bệnh nhân đã mua gói & được gán Bác sĩ',
    description: 'Truy vấn lấy ra tất cả các hồ sơ sức khỏe đã mua gói chăm sóc và được assign bác sĩ vào gói để bác sĩ quản lý các hồ sơ dưới quyền chăm sóc (take care) của mình.',
    response: { serialization: HealthProfile, isArray: true },
  })
  async getProfileList(
    @Query() query: QueryProfileListDto,
    @CurrentStaff() staff: StaffJwtPayload,
  ) {
    return this.healthProfilesService.getProfileList(query, staff);
  }

  @Get('profile-list')
  @UseGuards(StaffAuthGuard, StaffRolesGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Staff/Doctor Auth - Danh sách hồ sơ bệnh nhân đã mua gói & được gán Bác sĩ (Kebab-case Alias)',
    description: 'Truy vấn lấy ra tất cả các hồ sơ sức khỏe đã mua gói chăm sóc và được assign bác sĩ vào gói.',
    response: { serialization: HealthProfile, isArray: true },
  })
  async getProfileListAlias(
    @Query() query: QueryProfileListDto,
    @CurrentStaff() staff: StaffJwtPayload,
  ) {
    return this.healthProfilesService.getProfileList(query, staff);
  }

  @Post()
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'App Auth - Tạo mới hồ sơ sức khỏe cho tài khoản',
    description: 'Bệnh nhân tạo hồ sơ mới cho bản thân hoặc người thân gắn với tài khoản đang đăng nhập.',
    response: { serialization: HealthProfile },
  })
  async createProfile(
    @Body() dto: CreateHealthProfileDto,
    @CurrentAccount() account: AppAccountJwtPayload,
  ) {
    return this.healthProfilesService.createAppProfile(dto, account.id);
  }

  @Post('facility')
  @UseGuards(StaffAuthGuard, StaffRolesGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Staff Auth - Tạo mới hồ sơ sức khỏe tại cơ sở y tế',
    description: 'Nhân viên y tế tạo hồ sơ bệnh nhân độc lập tại viện (không gắn tài khoản App, tự động liên kết với viện).',
    response: { serialization: HealthProfile },
  })
  async createFacilityProfile(
    @Body() dto: CreateFacilityHealthProfileDto,
    @CurrentStaff() staff: StaffJwtPayload,
  ) {
    return this.healthProfilesService.createFacilityProfile(dto, staff);
  }

  @Get('me')
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'App Auth - Lấy tất cả hồ sơ sức khỏe của tài khoản đang đăng nhập',
    description: 'Trả về danh sách hồ sơ cá nhân và người thân kèm danh mục bệnh nền và các gói chăm sóc điều trị (Care Subscriptions & Care Team) đã đăng ký.',
    response: { serialization: HealthProfile, isArray: true },
  })
  async getMyProfiles(@CurrentAccount() account: AppAccountJwtPayload) {
    return this.healthProfilesService.getMyProfiles(account.id);
  }

  @Public()
  @Get(':id')
  @Doc({
    summary: 'Public / App / CMS - Lấy chi tiết hồ sơ sức khỏe theo ID',
    description: 'Lấy thông tin chi tiết một hồ sơ sức khỏe kèm bệnh mạn tính và lịch sử liên kết viện',
    response: { serialization: HealthProfile },
  })
  async getProfileById(@Param('id') id: string) {
    return this.healthProfilesService.getProfileById(id);
  }

  @Patch(':id')
  @UseGuards(CombinedAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'App / Staff Auth - Cập nhật hồ sơ sức khỏe',
    description: 'Bệnh nhân hoặc Nhân viên y tế cập nhật thông tin nhân khẩu học, nhóm máu, dị ứng hoặc bệnh mạn tính',
    response: { serialization: HealthProfile },
  })
  async updateProfile(
    @Param('id') id: string,
    @Body() dto: UpdateHealthProfileDto,
    @CurrentAuthUser() user: AuthUserContext,
  ) {
    return this.healthProfilesService.updateProfile(id, dto, user);
  }

  @Delete(':id')
  @UseGuards(CombinedAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'App / Staff Auth - Xóa hồ sơ sức khỏe',
    description: 'Xóa một hồ sơ sức khỏe khỏi tài khoản hoặc hệ thống',
  })
  async deleteProfile(
    @Param('id') id: string,
    @CurrentAuthUser() user: AuthUserContext,
  ) {
    return this.healthProfilesService.deleteProfile(id, user);
  }
}
