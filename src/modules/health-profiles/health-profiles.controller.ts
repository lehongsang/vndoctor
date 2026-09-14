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
import { CreateHealthProfileDto, QueryHealthProfileDto, UpdateHealthProfileDto } from './dtos';
import { Doc } from '@/commons/docs/doc.decorator';
import { HealthProfile } from './entities/health-profile.entity';
import { AppAuthGuard } from '@/commons/guards/app-auth.guard';
import { StaffAuthGuard } from '@/commons/guards/staff-auth.guard';
import { StaffRolesGuard } from '@/commons/guards/staff-roles.guard';
import { AppAccountJwtPayload, CurrentAccount } from '@/commons/decorators/current-account.decorator';
import { CurrentStaff, StaffJwtPayload } from '@/commons/decorators/current-staff.decorator';
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

  @Post()
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'App Auth - Tạo mới hồ sơ sức khỏe (Bản thân hoặc người thân)',
    description: 'Bệnh nhân tạo hồ sơ sức khỏe mới thuộc tài khoản của mình (quan hệ SELF, FATHER, MOTHER...)',
    response: { serialization: HealthProfile },
  })
  async createProfile(
    @Body() dto: CreateHealthProfileDto,
    @CurrentAccount() account: AppAccountJwtPayload,
  ) {
    return this.healthProfilesService.createProfile(dto, account.id);
  }

  @Get('me')
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'App Auth - Lấy tất cả hồ sơ sức khỏe của tài khoản đang đăng nhập',
    description: 'Trả về danh sách hồ sơ cá nhân và người thân kèm danh mục bệnh nền đã chọn',
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
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'App Auth - Cập nhật hồ sơ sức khỏe',
    description: 'Cập nhật thông tin nhân khẩu học, nhóm máu, dị ứng hoặc bệnh mạn tính',
    response: { serialization: HealthProfile },
  })
  async updateProfile(
    @Param('id') id: string,
    @Body() dto: UpdateHealthProfileDto,
    @CurrentAccount() account: AppAccountJwtPayload,
  ) {
    return this.healthProfilesService.updateProfile(id, dto, account.id);
  }

  @Delete(':id')
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'App Auth - Xóa hồ sơ sức khỏe',
    description: 'Xóa một hồ sơ sức khỏe của người thân khỏi tài khoản',
  })
  async deleteProfile(
    @Param('id') id: string,
    @CurrentAccount() account: AppAccountJwtPayload,
  ) {
    return this.healthProfilesService.deleteProfile(id, account.id);
  }
}
