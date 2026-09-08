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
import { PatientLinksService } from './patient-links.service';
import {
  CreatePatientLinkDto,
  QueryPatientLinkDto,
  UpdatePatientLinkDto,
} from './dtos';
import { Doc } from '@/commons/docs/doc.decorator';
import { FacilityPatientLink } from './entities/facility-patient-link.entity';
import { StaffAuthGuard } from '@/commons/guards/staff-auth.guard';
import { StaffRolesGuard } from '@/commons/guards/staff-roles.guard';
import { CurrentStaff, StaffJwtPayload } from '@/commons/decorators/current-staff.decorator';
import { HealthProfile } from '@/modules/health-profiles/entities/health-profile.entity';

@ApiTags('Patient Links (Liên kết Cơ sở Y tế - Bệnh nhân)')
@ApiBearerAuth('access-token')
@UseGuards(StaffAuthGuard, StaffRolesGuard)
@Controller('patient-links')
export class PatientLinksController {
  constructor(
    private readonly patientLinksService: PatientLinksService,
  ) {}

  @Post()
  @Doc({
    summary: 'Staff Auth - Liên kết hồ sơ bệnh nhân vào cơ sở y tế',
    description: 'Nhân viên y tế hoặc tiếp đón liên kết hồ sơ bệnh nhân vào viện qua SĐT & healthProfileId',
    response: { serialization: FacilityPatientLink },
  })
  async createLink(
    @Body() dto: CreatePatientLinkDto,
    @CurrentStaff() staff: StaffJwtPayload,
  ) {
    return this.patientLinksService.createLink(dto, staff);
  }

  @Get('search-patients')
  @Doc({
    summary: 'Staff Auth - Tra cứu bệnh nhân theo SĐT, CCCD hoặc Tên',
    description: 'Tìm kiếm hồ sơ bệnh nhân trên hệ thống để thực hiện liên kết vào cơ sở',
    response: { serialization: HealthProfile, isArray: true },
  })
  async searchPatients(@Query('keyword') keyword: string) {
    return this.patientLinksService.searchPatients(keyword);
  }

  @Get()
  @Doc({
    summary: 'Staff Auth - Danh sách bệnh nhân đã liên kết với cơ sở',
    description: 'Lấy danh sách phân trang các bệnh nhân thuộc cơ sở y tế quản lý',
  })
  async getFacilityLinks(
    @Query() query: QueryPatientLinkDto,
    @CurrentStaff() staff: StaffJwtPayload,
  ) {
    return this.patientLinksService.getFacilityLinks(query, staff);
  }

  @Get(':id')
  @Doc({
    summary: 'Staff Auth - Chi tiết liên kết theo ID',
    description: 'Lấy thông tin chi tiết một bản ghi liên kết',
    response: { serialization: FacilityPatientLink },
  })
  async getLinkById(@Param('id') id: string) {
    return this.patientLinksService.getLinkById(id);
  }

  @Patch(':id')
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
