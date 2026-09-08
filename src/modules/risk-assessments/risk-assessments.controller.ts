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
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
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

  @Post()
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'App Auth - Gửi dữ liệu đánh giá yếu tố nguy cơ tim mạch',
    description: 'Bệnh nhân hoặc nhân viên nhập các chỉ số lâm sàng để hệ thống tự động tra cứu từ điển và trả về kết quả phân tầng nguy cơ',
    response: { serialization: RiskFactorAssessmentResult },
  })
  async create(
    @Body() dto: CreateRiskAssessmentDto,
    @CurrentAccount() account: AppAccountJwtPayload,
  ) {
    return this.riskAssessmentsService.create(dto, account.id);
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
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'App Auth - Lấy chi tiết kết quả đánh giá nguy cơ',
    description: 'Xem chi tiết kết quả phân tầng nguy cơ, điểm nguy cơ và kết luận đánh giá của bác sĩ',
    response: { serialization: RiskFactorAssessmentResult },
  })
  async findOne(
    @Param('id') id: string,
    @CurrentAccount() account: AppAccountJwtPayload,
  ) {
    return this.riskAssessmentsService.findOne(id, account.id);
  }

  @Post(':id/evaluate')
  @UseGuards(StaffAuthGuard, StaffRolesGuard)
  @Roles(StaffRole.DOCTOR, StaffRole.ADMIN)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Staff Auth (Doctor) - Bác sĩ thẩm định và kết luận mức độ nguy cơ',
    description: 'Bác sĩ xác nhận điểm nguy cơ, phân tầng mức độ nguy cơ (LOW, HIGH, VERY_HIGH), chẩn đoán và khuyến nghị phác đồ',
    response: { serialization: RiskFactorAssessmentResult },
  })
  async evaluate(
    @Param('id') id: string,
    @Body() dto: EvaluateRiskAssessmentDto,
    @CurrentStaff() staff: StaffJwtPayload,
  ) {
    return this.riskAssessmentsService.evaluate(id, dto, staff.id);
  }
}
