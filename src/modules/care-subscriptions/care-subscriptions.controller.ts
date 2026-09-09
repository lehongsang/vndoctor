import { CurrentAccount, AppAccountJwtPayload } from '@/commons/decorators/current-account.decorator';
import { CurrentStaff, StaffJwtPayload } from '@/commons/decorators/current-staff.decorator';
import { Roles } from '@/commons/decorators/roles.decorator';
import { Doc } from '@/commons/docs/doc.decorator';
import { StaffRole } from '@/commons/enums/vndoctor.enum';
import { AppAuthGuard } from '@/commons/guards/app-auth.guard';
import { StaffAuthGuard } from '@/commons/guards/staff-auth.guard';
import { StaffRolesGuard } from '@/commons/guards/staff-roles.guard';
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CareSubscriptionsService } from './care-subscriptions.service';
import {
  AssignAndActivateCareSubscriptionDto,
  CreateCareSubscriptionDto,
  QueryCareSubscriptionDto,
  UpdateCareTeamDto,
} from './dtos';
import { PatientCareSubscription } from './entities/care-subscription.entity';

/**
 * REST API Controller for managing Patient Care Subscriptions and Care Team.
 */
@ApiTags('Care Subscriptions (Đăng Ký Gói & Phân Công Care Team)')
@Controller('care-subscriptions')
export class CareSubscriptionsController {
  constructor(
    private readonly careSubscriptionsService: CareSubscriptionsService,
  ) {}

  @Post()
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'App Auth - Bệnh nhân đăng ký gói chăm sóc sức khỏe',
    description: 'Bệnh nhân đăng ký gói dịch vụ cho hồ sơ của mình. Hệ thống tạo subscription ở trạng thái PENDING chờ Viện tiếp nhận và phân công Bác sĩ.',
    response: { serialization: PatientCareSubscription },
  })
  async create(
    @Body() dto: CreateCareSubscriptionDto,
    @CurrentAccount() account: AppAccountJwtPayload,
  ): Promise<PatientCareSubscription> {
    return this.careSubscriptionsService.create(dto, account.id);
  }

  @Get('me')
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'App Auth - Lấy danh sách gói chăm sóc đã đăng ký của Bệnh nhân',
    description: 'Trả về tất cả các gói dịch vụ chăm sóc đã đăng ký (PENDING, ACTIVE, EXPIRED...) của tài khoản App đang đăng nhập.',
    response: { serialization: PatientCareSubscription, isArray: true },
  })
  async getMySubscriptions(
    @Query() query: QueryCareSubscriptionDto,
    @CurrentAccount() account: AppAccountJwtPayload,
  ) {
    return this.careSubscriptionsService.findAll(query, undefined, account.id);
  }

  @Get()
  @UseGuards(StaffAuthGuard, StaffRolesGuard)
  @Roles(StaffRole.ADMIN, StaffRole.DOCTOR, StaffRole.NURSE, StaffRole.STAFF)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'CMS Staff Auth - Danh sách đăng ký gói chăm sóc theo cơ sở y tế',
    description: 'Nhân viên y tế/Điều phối viên xem danh sách các lượt đăng ký gói (phân trang, lọc theo trạng thái PENDING/ACTIVE, bác sĩ, điều dưỡng...).',
    response: { serialization: PatientCareSubscription, isArray: true },
  })
  async findAll(
    @Query() query: QueryCareSubscriptionDto,
    @CurrentStaff() staff: StaffJwtPayload,
  ) {
    return this.careSubscriptionsService.findAll(query, staff.facilityId);
  }

  @Get(':id')
  @UseGuards(StaffAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Staff Auth - Xem chi tiết gói đăng ký và đội ngũ Care Team',
    description: 'Lấy chi tiết lượt đăng ký bao gồm thông tin gói, hồ sơ bệnh nhân, bác sĩ, y tá và chuyên gia phụ trách.',
    response: { serialization: PatientCareSubscription },
  })
  async findById(
    @Param('id') id: string,
    @CurrentStaff() staff: StaffJwtPayload,
  ): Promise<PatientCareSubscription> {
    return this.careSubscriptionsService.findById(id, staff.facilityId);
  }

  @Post(':id/assign-and-activate')
  @UseGuards(StaffAuthGuard, StaffRolesGuard)
  @Roles(StaffRole.ADMIN, StaffRole.DOCTOR)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'CMS Admin/Doctor - Phân công Care Team và Kích hoạt gói chăm sóc',
    description: 'Điều phối viên/Bác sĩ chỉ định Bác sĩ chính, Y tá, Chuyên gia (đối với gói VIP). Hệ thống tự động tính hạn dùng (startedAt, expiresAt), chuyển trạng thái ACTIVE và khởi tạo phòng chat nhóm y tế (CARE_TEAM).',
    response: { serialization: PatientCareSubscription },
  })
  async assignAndActivate(
    @Param('id') id: string,
    @Body() dto: AssignAndActivateCareSubscriptionDto,
    @CurrentStaff() staff: StaffJwtPayload,
  ): Promise<PatientCareSubscription> {
    return this.careSubscriptionsService.assignAndActivate(id, dto, staff.facilityId);
  }

  @Patch(':id/care-team')
  @UseGuards(StaffAuthGuard, StaffRolesGuard)
  @Roles(StaffRole.ADMIN)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'CMS Admin - Thay đổi Bác sĩ / Y tá trong Care Team',
    description: 'Cho phép thay đổi nhân sự y tế phụ trách khi bác sĩ nghỉ phép hoặc đổi ca trực trong thời gian gói đang hoạt động.',
    response: { serialization: PatientCareSubscription },
  })
  async updateCareTeam(
    @Param('id') id: string,
    @Body() dto: UpdateCareTeamDto,
    @CurrentStaff() staff: StaffJwtPayload,
  ): Promise<PatientCareSubscription> {
    return this.careSubscriptionsService.updateCareTeam(id, dto, staff.facilityId);
  }

  @Post(':id/cancel')
  @UseGuards(StaffAuthGuard, StaffRolesGuard)
  @Roles(StaffRole.ADMIN)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'CMS Admin - Hủy gói đăng ký chăm sóc',
    description: 'Chuyển trạng thái gói sang CANCELLED khi bệnh nhân có yêu cầu hủy gói.',
    response: { serialization: PatientCareSubscription },
  })
  async cancel(
    @Param('id') id: string,
    @CurrentStaff() staff: StaffJwtPayload,
  ): Promise<PatientCareSubscription> {
    return this.careSubscriptionsService.cancel(id, staff.facilityId);
  }
}
