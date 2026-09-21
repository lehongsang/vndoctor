import { AppAccountJwtPayload, CurrentAccount } from '@/commons/decorators/current-account.decorator';
import { AuthUserContext, CurrentAuthUser } from '@/commons/decorators/current-auth-user.decorator';
import { CurrentStaff, StaffJwtPayload } from '@/commons/decorators/current-staff.decorator';
import { Roles } from '@/commons/decorators/roles.decorator';
import { Doc } from '@/commons/docs/doc.decorator';
import { StaffRole } from '@/commons/enums/vndoctor.enum';
import { AppAuthGuard } from '@/commons/guards/app-auth.guard';
import { CombinedAuthGuard } from '@/commons/guards/combined-auth.guard';
import { StaffAuthGuard } from '@/commons/guards/staff-auth.guard';
import { StaffRolesGuard } from '@/commons/guards/staff-roles.guard';
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
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import {
  EscalateExpertTargetDto,
  QueryPatientTargetDto,
  UpdatePatientTargetDto,
  VerifyPatientTargetDto,
} from './dtos';
import { PatientTreatmentTarget } from './entities/patient-treatment-target.entity';
import { TreatmentTargetsService } from './treatment-targets.service';

@ApiTags('Treatment Targets (Mục tiêu Điều trị Cá nhân hóa theo Từ điển Bộ Y Tế)')
@Controller('treatment-targets')
export class TreatmentTargetsController {
  constructor(private readonly treatmentTargetsService: TreatmentTargetsService) {}

  @Get('my-targets')
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'App Auth - Danh sách mục tiêu điều trị của bệnh nhân',
    description:
      'Lấy danh sách các mục tiêu điều trị thuộc hồ sơ sức khỏe của bệnh nhân. Chỉ hiển thị nếu hồ sơ có gói chăm sóc ACTIVE hoặc đã được bác sĩ xác nhận.',
    response: { serialization: PatientTreatmentTarget, isArray: true },
  })
  async findAllForApp(
    @Query() query: QueryPatientTargetDto,
    @CurrentAccount() account: AppAccountJwtPayload,
  ) {
    return this.treatmentTargetsService.findAllForPatient(query, account.id);
  }

  @Get('my-targets/:id')
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'App Auth - Chi tiết mục tiêu điều trị của bệnh nhân',
    description: 'Xem chi tiết mục tiêu điều trị theo ID (yêu cầu gói chăm sóc ACTIVE hoặc đã duyệt)',
    response: { serialization: PatientTreatmentTarget },
  })
  async findOneForApp(
    @Param('id') id: string,
    @CurrentAccount() account: AppAccountJwtPayload,
  ) {
    return this.treatmentTargetsService.findOneForPatient(id, account.id);
  }

  @Get('by-assessment/:assessmentId')
  @UseGuards(CombinedAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiParam({
    name: 'assessmentId',
    required: true,
    description: 'UUID của kết quả phân tầng nguy cơ (assessmentResultId hoặc assessmentInputId)',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @Doc({
    summary: 'App & Staff Auth - Lấy mục tiêu điều trị theo ID phân tầng nguy cơ',
    description:
      'Tra cứu mục tiêu điều trị được sinh từ kết quả phân tầng nguy cơ tương ứng. Hỗ trợ cả Bệnh nhân (chỉ xem hồ sơ của mình khi có gói ACTIVE hoặc đã duyệt) và Bác sĩ/Nhân viên y tế.',
    response: { serialization: PatientTreatmentTarget },
  })
  async findByAssessment(
    @Param('assessmentId') assessmentId: string,
    @CurrentAuthUser() user: AuthUserContext,
  ) {
    const accountId = user.type === 'APP_ACCOUNT' ? user.account?.id : undefined;
    return this.treatmentTargetsService.findByAssessmentId(assessmentId, accountId);
  }

  @Get()
  @UseGuards(StaffAuthGuard, StaffRolesGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Staff Auth - Danh sách mục tiêu điều trị (CMS)',
    description: 'Bác sĩ/Nhân viên y tế tra cứu và lọc danh sách mục tiêu điều trị của bệnh nhân',
    response: { serialization: PatientTreatmentTarget, isArray: true },
  })
  async findAllForStaff(
    @Query() query: QueryPatientTargetDto,
    @CurrentStaff() staff: StaffJwtPayload,
  ) {
    return this.treatmentTargetsService.findAllForStaff(query, staff);
  }

  @Get(':id')
  @UseGuards(StaffAuthGuard, StaffRolesGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Staff Auth - Xem chi tiết mục tiêu điều trị (CMS)',
    description: 'Bác sĩ/Nhân viên y tế xem chi tiết mục tiêu điều trị theo ID',
    response: { serialization: PatientTreatmentTarget },
  })
  async findOneForStaff(@Param('id') id: string) {
    return this.treatmentTargetsService.findOneForStaff(id);
  }

  @Patch(':id')
  @UseGuards(StaffAuthGuard, StaffRolesGuard)
  @Roles(StaffRole.DOCTOR, StaffRole.ADMIN)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Staff Auth (Doctor/Admin) - Bác sĩ cập nhật, tinh chỉnh mục tiêu điều trị tự sinh',
    description: 'Bác sĩ điều chỉnh các chỉ số mục tiêu (huyết áp, mỡ máu, HbA1c, BMI, chế độ ăn, tập luyện...) do hệ thống tự sinh',
    response: { serialization: PatientTreatmentTarget },
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePatientTargetDto,
    @CurrentStaff() staff: StaffJwtPayload,
  ) {
    return this.treatmentTargetsService.update(id, dto, staff);
  }

  @Post(':id/verify')
  @UseGuards(StaffAuthGuard, StaffRolesGuard)
  @Roles(StaffRole.DOCTOR, StaffRole.ADMIN)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Staff Auth (Doctor/Admin) - Bác sĩ phê duyệt mục tiêu điều trị',
    description: 'Bác sĩ phụ trách hoặc Bác sĩ chuyên gia xác nhận phê duyệt mục tiêu (DOCTOR_VERIFIED / EXPERT_VERIFIED)',
    response: { serialization: PatientTreatmentTarget },
  })
  async verify(
    @Param('id') id: string,
    @Body() dto: VerifyPatientTargetDto,
    @CurrentStaff() staff: StaffJwtPayload,
  ) {
    return this.treatmentTargetsService.verify(id, dto, staff);
  }

  @Post(':id/escalate-expert')
  @UseGuards(StaffAuthGuard, StaffRolesGuard)
  @Roles(StaffRole.DOCTOR, StaffRole.ADMIN)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Staff Auth (Doctor) - Bác sĩ chuyển tiếp mục tiêu sang Bác sĩ Chuyên gia (Gói VIP)',
    description: 'Khi ca bệnh phức tạp hoặc thuộc gói VIP có chuyên gia, bác sĩ phụ trách chuyển tiếp mục tiêu sang Bác sĩ Chuyên gia để xin ý kiến và phê duyệt',
    response: { serialization: PatientTreatmentTarget },
  })
  async escalateToExpert(
    @Param('id') id: string,
    @Body() dto: EscalateExpertTargetDto,
    @CurrentStaff() staff: StaffJwtPayload,
  ) {
    return this.treatmentTargetsService.escalateToExpert(id, dto, staff);
  }

  @Delete(':id')
  @UseGuards(StaffAuthGuard, StaffRolesGuard)
  @Roles(StaffRole.DOCTOR, StaffRole.ADMIN)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Staff Auth (Doctor/Admin) - Xóa mềm mục tiêu điều trị',
    description: 'Bác sĩ hoặc Quản trị viên xóa mềm mục tiêu điều trị',
  })
  async remove(@Param('id') id: string) {
    return this.treatmentTargetsService.remove(id);
  }
}

