import { AppAccountJwtPayload, CurrentAccount } from '@/commons/decorators/current-account.decorator';
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
import {
  CreatePatientTargetDto,
  QueryPatientTargetDto,
  UpdatePatientTargetDto,
  VerifyPatientTargetDto,
} from './dtos';
import { PatientTreatmentTarget } from './entities/patient-treatment-target.entity';
import { TreatmentTargetsService } from './treatment-targets.service';

@ApiTags('Treatment Targets (Mục tiêu Điều trị Cá nhân hóa)')
@Controller('treatment-targets')
export class TreatmentTargetsController {
  constructor(private readonly treatmentTargetsService: TreatmentTargetsService) {}

  @Post()
  @UseGuards(StaffAuthGuard, StaffRolesGuard)
  @Roles(StaffRole.DOCTOR, StaffRole.ADMIN)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Staff Auth (Doctor) - Tạo mục tiêu điều trị cá nhân cho bệnh nhân',
    description: 'Bác sĩ thiết lập bộ mục tiêu điều trị (huyết áp, mỡ máu, HbA1c, BMI...) cho hồ sơ sức khỏe',
    response: { serialization: PatientTreatmentTarget },
  })
  async createByDoctor(
    @Body() dto: CreatePatientTargetDto,
    @CurrentStaff() staff: StaffJwtPayload,
  ) {
    return this.treatmentTargetsService.create(dto, staff.id);
  }

  @Post('self')
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'App Auth - Người dùng tự khởi tạo mục tiêu điều trị (Draft)',
    description: 'Bệnh nhân tự tạo hoặc chọn mã từ điển mục tiêu điều trị tham khảo',
    response: { serialization: PatientTreatmentTarget },
  })
  async createByPatient(
    @Body() dto: CreatePatientTargetDto,
    @CurrentAccount() account: AppAccountJwtPayload,
  ) {
    return this.treatmentTargetsService.create(dto, undefined, account.id);
  }

  @Post(':id/verify')
  @UseGuards(StaffAuthGuard, StaffRolesGuard)
  @Roles(StaffRole.DOCTOR, StaffRole.ADMIN)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Staff Auth (Doctor) - Bác sĩ duyệt & điều chỉnh mục tiêu điều trị',
    description: 'Bác sĩ kiểm tra, điều chỉnh các chỉ số mục tiêu và xác nhận phê duyệt (DOCTOR_VERIFIED)',
    response: { serialization: PatientTreatmentTarget },
  })
  async verify(
    @Param('id') id: string,
    @Body() dto: VerifyPatientTargetDto,
    @CurrentStaff() staff: StaffJwtPayload,
  ) {
    return this.treatmentTargetsService.verify(id, dto, staff.id);
  }

  @Get('my-targets')
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'App Auth - Danh sách mục tiêu điều trị của bệnh nhân',
    description: 'Lấy danh sách các mục tiêu điều trị gắn với các hồ sơ sức khỏe của tài khoản App',
    response: { serialization: PatientTreatmentTarget, isArray: true },
  })
  async findAllForApp(
    @Query() query: QueryPatientTargetDto,
    @CurrentAccount() account: AppAccountJwtPayload,
  ) {
    return this.treatmentTargetsService.findAll(query, account.id);
  }

  @Get('my-targets/:id')
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'App Auth - Chi tiết mục tiêu điều trị của bệnh nhân',
    description: 'Xem chi tiết mục tiêu điều trị theo ID',
    response: { serialization: PatientTreatmentTarget },
  })
  async findOneForApp(
    @Param('id') id: string,
    @CurrentAccount() account: AppAccountJwtPayload,
  ) {
    return this.treatmentTargetsService.findOne(id, account.id);
  }

  @Get()
  @UseGuards(StaffAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Staff Auth - Danh sách mục tiêu điều trị (CMS)',
    description: 'Tìm kiếm và lọc danh sách mục tiêu điều trị trên hệ thống CMS',
    response: { serialization: PatientTreatmentTarget, isArray: true },
  })
  async findAllForStaff(@Query() query: QueryPatientTargetDto) {
    return this.treatmentTargetsService.findAll(query);
  }

  @Get(':id')
  @UseGuards(StaffAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Staff Auth - Xem chi tiết mục tiêu điều trị (CMS)',
    description: 'Xem chi tiết mục tiêu điều trị theo ID',
    response: { serialization: PatientTreatmentTarget },
  })
  async findOneForStaff(@Param('id') id: string) {
    return this.treatmentTargetsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(StaffAuthGuard, StaffRolesGuard)
  @Roles(StaffRole.DOCTOR, StaffRole.ADMIN)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Staff Auth (Doctor) - Chỉnh sửa mục tiêu điều trị',
    description: 'Bác sĩ cập nhật nội dung hoặc chỉ số trong mục tiêu điều trị',
    response: { serialization: PatientTreatmentTarget },
  })
  async updateByDoctor(
    @Param('id') id: string,
    @Body() dto: UpdatePatientTargetDto,
    @CurrentStaff() staff: StaffJwtPayload,
  ) {
    return this.treatmentTargetsService.update(id, dto, staff.id);
  }

  @Patch('my-targets/:id')
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'App Auth - Bệnh nhân cập nhật mục tiêu điều trị (Draft)',
    description: 'Bệnh nhân cập nhật ghi chú hoặc thông tin mục tiêu điều trị cá nhân',
    response: { serialization: PatientTreatmentTarget },
  })
  async updateByPatient(
    @Param('id') id: string,
    @Body() dto: UpdatePatientTargetDto,
    @CurrentAccount() account: AppAccountJwtPayload,
  ) {
    return this.treatmentTargetsService.update(id, dto, undefined, account.id);
  }
}
