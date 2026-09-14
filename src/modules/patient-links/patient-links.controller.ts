import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Sse,
  UseGuards,
  MessageEvent,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Observable } from 'rxjs';
import { PatientLinksService } from './patient-links.service';
import { PatientLinksSseService } from './patient-links-sse.service';
import {
  CreatePatientLinkDto,
  QueryPatientLinkDto,
  UpdatePatientLinkDto,
} from './dtos';
import { Doc } from '@/commons/docs/doc.decorator';
import { FacilityPatientLink } from './entities/facility-patient-link.entity';
import { StaffAuthGuard } from '@/commons/guards/staff-auth.guard';
import { StaffRolesGuard } from '@/commons/guards/staff-roles.guard';
import { AppAuthGuard } from '@/commons/guards/app-auth.guard';
import { CurrentStaff, StaffJwtPayload } from '@/commons/decorators/current-staff.decorator';
import { AppAccountJwtPayload, CurrentAccount } from '@/commons/decorators/current-account.decorator';
import { HealthProfile } from '@/modules/health-profiles/entities/health-profile.entity';
import { ErrorCode } from '@/commons/exceptions';

@ApiTags('Patient Links (Liên kết Cơ sở Y tế - Bệnh nhân)')
@Controller('patient-links')
export class PatientLinksController {
  constructor(
    private readonly patientLinksService: PatientLinksService,
    private readonly sseService: PatientLinksSseService,
  ) {}

  @Sse('sse')
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'App Auth - Server-Sent Events (SSE) stream nhận thông báo lời mời liên kết hồ sơ',
    description: 'Kết nối SSE để App Bệnh nhân lắng nghe real-time các sự kiện lời mời liên kết (patient_link_invitation) và cập nhật trạng thái liên kết.',
  })
  sseEvents(@CurrentAccount() account: AppAccountJwtPayload): Observable<MessageEvent> {
    return this.sseService.subscribe(account.id);
  }

  @Get('my-invitations')
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'App Auth - Danh sách lời mời liên kết hồ sơ y tế đang chờ duyệt',
    description: 'Bệnh nhân xem các lời mời liên kết hồ sơ bệnh án từ cơ sở y tế đang ở trạng thái PENDING.',
    response: { serialization: FacilityPatientLink, isArray: true },
  })
  async getMyInvitations(@CurrentAccount() account: AppAccountJwtPayload) {
    return this.patientLinksService.getMyInvitations(account.id);
  }

  @Get('my-links')
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'App Auth - Danh sách cơ sở y tế đã liên kết với tài khoản bệnh nhân',
    description: 'Lấy toàn bộ các liên kết cơ sở y tế đang hoạt động (ACTIVE) của các hồ sơ thuộc tài khoản App.',
    response: { serialization: FacilityPatientLink, isArray: true },
  })
  async getMyLinks(@CurrentAccount() account: AppAccountJwtPayload) {
    return this.patientLinksService.getMyLinks(account.id);
  }

  @Patch('invitations/:id/accept')
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'App Auth - Bệnh nhân đồng ý lời mời liên kết hồ sơ y tế',
    description: 'Chuyển trạng thái liên kết từ PENDING sang ACTIVE.',
    response: { serialization: FacilityPatientLink },
    errors: [
      {
        status: HttpStatus.NOT_FOUND,
        errorCode: ErrorCode.PATIENT_LINK_NOT_FOUND,
        message: 'Bản ghi liên kết không tồn tại',
      },
      {
        status: HttpStatus.FORBIDDEN,
        errorCode: ErrorCode.HEALTH_PROFILE_ACCESS_DENIED,
        message: 'Bạn không sở hữu hồ sơ sức khỏe này',
      },
    ],
  })
  async acceptInvitation(
    @Param('id') id: string,
    @CurrentAccount() account: AppAccountJwtPayload,
  ) {
    return this.patientLinksService.acceptInvitation(id, account.id);
  }

  @Patch('invitations/:id/reject')
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'App Auth - Bệnh nhân từ chối lời mời liên kết hồ sơ y tế',
    description: 'Từ chối lời mời liên kết (chuyển trạng thái sang UNLINKED).',
    errors: [
      {
        status: HttpStatus.NOT_FOUND,
        errorCode: ErrorCode.PATIENT_LINK_NOT_FOUND,
        message: 'Bản ghi liên kết không tồn tại',
      },
      {
        status: HttpStatus.FORBIDDEN,
        errorCode: ErrorCode.HEALTH_PROFILE_ACCESS_DENIED,
        message: 'Bạn không sở hữu hồ sơ sức khỏe này',
      },
    ],
  })
  async rejectInvitation(
    @Param('id') id: string,
    @CurrentAccount() account: AppAccountJwtPayload,
  ) {
    return this.patientLinksService.rejectInvitation(id, account.id);
  }

  @Post()
  @UseGuards(StaffAuthGuard, StaffRolesGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Staff Auth - Liên kết hồ sơ bệnh nhân vào cơ sở y tế',
    description: 'Nhân viên y tế hoặc tiếp đón liên kết hồ sơ bệnh nhân vào viện qua SĐT & healthProfileId. Nếu chọn PENDING, hệ thống sẽ tự phát SSE gửi lời mời đến App bệnh nhân.',
    response: { serialization: FacilityPatientLink },
  })
  async createLink(
    @Body() dto: CreatePatientLinkDto,
    @CurrentStaff() staff: StaffJwtPayload,
  ) {
    return this.patientLinksService.createLink(dto, staff);
  }

  @Get('search-patients')
  @UseGuards(StaffAuthGuard, StaffRolesGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Staff Auth - Tra cứu bệnh nhân theo SĐT, CCCD hoặc Tên',
    description: 'Tìm kiếm hồ sơ bệnh nhân trên hệ thống để thực hiện liên kết vào cơ sở',
    response: { serialization: HealthProfile, isArray: true },
  })
  async searchPatients(@Query() query: QueryPatientLinkDto) {
    return this.patientLinksService.searchPlatformPatients(query);
  }

  @Get()
  @UseGuards(StaffAuthGuard, StaffRolesGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Staff Auth - Danh sách bệnh nhân đã liên kết với cơ sở',
    description: 'Lấy danh sách phân trang các bệnh nhân thuộc cơ sở y tế quản lý',
  })
  async getFacilityLinks(
    @Query() query: QueryPatientLinkDto,
    @CurrentStaff() staff: StaffJwtPayload,
  ) {
    return this.patientLinksService.getFacilityPatients(query, staff);
  }

  @Get(':id')
  @UseGuards(StaffAuthGuard, StaffRolesGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Staff Auth - Chi tiết liên kết theo ID',
    description: 'Lấy thông tin chi tiết một bản ghi liên kết',
    response: { serialization: FacilityPatientLink },
  })
  async getLinkById(@Param('id') id: string) {
    return this.patientLinksService.getLinkById(id);
  }

  @Patch(':id')
  @UseGuards(StaffAuthGuard, StaffRolesGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Staff Auth - Cập nhật trạng thái hoặc mã bệnh nhân',
    description: 'Cập nhật mã bệnh nhân viện cấp (Mã BN) hoặc chuyển trạng thái liên kết (ACTIVE, UNLINKED)',
    response: { serialization: FacilityPatientLink },
  })
  async updateLink(
    @Param('id') id: string,
    @Body() dto: UpdatePatientLinkDto,
    @CurrentStaff() staff: StaffJwtPayload,
  ) {
    return this.patientLinksService.updateLink(id, dto, staff);
  }

  @Delete(':facilityId/:healthProfileId')
  @UseGuards(StaffAuthGuard, StaffRolesGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Staff Auth - Hủy liên kết bệnh nhân khỏi cơ sở',
    description: 'Hủy liên kết hồ sơ bệnh nhân khỏi cơ sở y tế',
  })
  async unlinkPatient(
    @Param('facilityId') facilityId: string,
    @Param('healthProfileId') healthProfileId: string,
  ) {
    return this.patientLinksService.unlinkPatient(facilityId, healthProfileId);
  }
}
