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
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import {
  CreateRiskAssessmentDto,
  EvaluateRiskAssessmentDto,
  QueryRiskAssessmentDto,
} from './dtos';
import { RiskFactorAssessmentResult } from './entities/risk-factor-assessment-result.entity';
import { RiskAssessmentsService } from './risk-assessments.service';

@ApiTags('Risk Assessments (Đánh giá Yếu tố Nguy cơ Tim mạch / PTYTNC)')
@Controller('risk-assessments')
export class RiskAssessmentsController {
  constructor(private readonly riskAssessmentsService: RiskAssessmentsService) {}

  @Get('form-schema')
  @UseGuards(CombinedAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiQuery({
    name: 'healthProfileId',
    required: true,
    description: 'UUID của hồ sơ sức khỏe cá nhân (HealthProfile ID)',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @Doc({
    summary: 'Lấy Dynamic JSON Schema Form Phân Tầng Nguy Cơ (Auto-fill & Lock)',
    description:
      'Trả về cấu trúc 3 khối trường (GENERAL_METRICS, TARGET_ORGAN_DAMAGE, CHRONIC_DISEASES). Tự động điền tuổi, giới tính và khóa (disabled: true) các trường bệnh nền đã có trong hồ sơ sức khỏe.',
  })
  async getFormSchema(
    @Query('healthProfileId') healthProfileId: string,
    @CurrentAuthUser() user: AuthUserContext,
  ) {
    const accountId = user.type === 'APP_ACCOUNT' ? user.account?.id : undefined;
    return this.riskAssessmentsService.getFormSchema(healthProfileId, accountId);
  }

  @Post()
  @UseGuards(CombinedAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'App / Staff Auth - Gửi dữ liệu đánh giá yếu tố nguy cơ tim mạch',
    description:
      'Hỗ trợ Bệnh nhân hoặc Bác sĩ/Nhân viên y tế gửi dữ liệu đánh giá nguy cơ (SCORE2 hoặc có bệnh nền). Tự động tra cứu từ điển y khoa và trả về phân tầng cùng cờ đỏ cảnh báo.',
    response: { serialization: RiskFactorAssessmentResult },
  })
  async create(
    @Body() dto: CreateRiskAssessmentDto,
    @CurrentAuthUser() user: AuthUserContext,
  ) {
    if (user.type === 'STAFF' && user.staff?.facilityId && !dto.facilityId) {
      dto.facilityId = user.staff.facilityId;
    }
    const accountId = user.type === 'APP_ACCOUNT' ? user.account?.id : undefined;
    return this.riskAssessmentsService.create(dto, accountId);
  }

  @Get()
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'App Auth - Lấy danh sách kết quả đánh giá nguy cơ của bệnh nhân',
    description: 'Lấy lịch sử các kết quả phân tầng nguy cơ có lọc theo hồ sơ, mức độ nguy cơ',
    response: { serialization: RiskFactorAssessmentResult, isArray: true },
  })
  async findAllForApp(
    @Query() query: QueryRiskAssessmentDto,
    @CurrentAccount() account: AppAccountJwtPayload,
  ) {
    return this.riskAssessmentsService.findAll(query, account.id);
  }

  @Get('staff')
  @UseGuards(StaffAuthGuard, StaffRolesGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Staff Auth - Danh sách phiếu đánh giá nguy cơ tại cơ sở y tế',
    description: 'Bác sĩ/Nhân viên y tế tra cứu danh sách kết quả đánh giá cần thẩm định hoặc theo dõi',
    response: { serialization: RiskFactorAssessmentResult, isArray: true },
  })
  async findAllForStaff(
    @Query() query: QueryRiskAssessmentDto,
    @CurrentStaff() staff: StaffJwtPayload,
  ) {
    if (staff.role !== StaffRole.ADMIN && !query.facilityId) {
      query.facilityId = staff.facilityId;
    }
    return this.riskAssessmentsService.findAll(query);
  }

  @Get(':id')
  @UseGuards(CombinedAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'App / Staff Auth - Lấy chi tiết kết quả đánh giá nguy cơ',
    description: 'Xem chi tiết kết quả phân tầng nguy cơ, điểm nguy cơ và kết luận đánh giá của bác sĩ',
    response: { serialization: RiskFactorAssessmentResult },
  })
  async findOne(
    @Param('id') id: string,
    @CurrentAuthUser() user: AuthUserContext,
  ) {
    const accountId = user.type === 'APP_ACCOUNT' ? user.account?.id : undefined;
    return this.riskAssessmentsService.findOne(id, accountId);
  }

  @Post(':id/evaluate')
  @UseGuards(StaffAuthGuard, StaffRolesGuard)
  @Roles(StaffRole.DOCTOR, StaffRole.ADMIN)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Staff Auth (Doctor) - Bác sĩ xác nhận (confirm) phiếu phân tầng và đưa ra khuyến nghị',
    description: 'Truyền vào ID của Result (hoặc Input). Bác sĩ xác nhận kết quả phân tầng của hệ thống và ghi nhận kết luận chẩn đoán, khuyến nghị điều trị.',
    response: { serialization: RiskFactorAssessmentResult },
  })
  async evaluate(
    @Param('id') id: string,
    @Body() dto: EvaluateRiskAssessmentDto,
    @CurrentStaff() staff: StaffJwtPayload,
  ) {
    return this.riskAssessmentsService.evaluate(id, dto, staff.id);
  }

  @Delete(':id')
  @UseGuards(CombinedAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Dual Auth - Xóa mềm phiếu đánh giá nguy cơ',
    description: 'Bệnh nhân (sở hữu hồ sơ) hoặc Bác sĩ/Admin xóa mềm phiếu đánh giá nguy cơ',
  })
  async delete(
    @Param('id') id: string,
    @CurrentAuthUser() user: AuthUserContext,
  ) {
    return this.riskAssessmentsService.remove(
      id,
      user.type === 'APP_ACCOUNT' ? user.account?.id : undefined,
    );
  }
}
