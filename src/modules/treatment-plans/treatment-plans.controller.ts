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
  CreateTreatmentPlanDto,
  CreateTreatmentTemplateDto,
  QueryTreatmentPlanDto,
  QueryTreatmentTemplateDto,
  UpdateTreatmentPlanDto,
  UpdateTreatmentTemplateDto,
} from './dtos';
import { TreatmentPlan } from './entities/treatment-plan.entity';
import { TreatmentTemplate } from './entities/treatment-template.entity';
import { TreatmentPlansService } from './treatment-plans.service';

@ApiTags('Treatment Plans (Phác đồ & Mẫu Phác đồ Điều trị)')
@Controller('treatment-plans')
export class TreatmentPlansController {
  constructor(private readonly treatmentPlansService: TreatmentPlansService) {}

  // ==========================================
  // TEMPLATES
  // ==========================================

  @Post('templates')
  @UseGuards(StaffAuthGuard, StaffRolesGuard)
  @Roles(StaffRole.ADMIN, StaffRole.DOCTOR)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Staff Auth - Tạo mới mẫu phác đồ điều trị của cơ sở y tế',
    description: 'Thêm mới mẫu phác đồ chuẩn cho cơ sở y tế theo nhóm bệnh',
    response: { serialization: TreatmentTemplate },
  })
  async createTemplate(
    @Body() dto: CreateTreatmentTemplateDto,
    @CurrentStaff() staff: StaffJwtPayload,
  ) {
    return this.treatmentPlansService.createTemplate(dto, staff.facilityId);
  }

  @Get('templates')
  @UseGuards(StaffAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Staff Auth - Danh sách mẫu phác đồ điều trị',
    description: 'Lấy danh sách các mẫu phác đồ theo cơ sở y tế hoặc nhóm bệnh',
    response: { serialization: TreatmentTemplate, isArray: true },
  })
  async findTemplates(@Query() query: QueryTreatmentTemplateDto) {
    return this.treatmentPlansService.findTemplates(query);
  }

  @Get('templates/:id')
  @UseGuards(StaffAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Staff Auth - Xem chi tiết mẫu phác đồ',
    description: 'Xem chi tiết nội dung mẫu phác đồ theo ID',
    response: { serialization: TreatmentTemplate },
  })
  async findTemplateById(@Param('id') id: string) {
    return this.treatmentPlansService.findTemplateById(id);
  }

  @Patch('templates/:id')
  @UseGuards(StaffAuthGuard, StaffRolesGuard)
  @Roles(StaffRole.ADMIN, StaffRole.DOCTOR)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Staff Auth - Chỉnh sửa mẫu phác đồ',
    description: 'Cập nhật tên, nội dung hoặc trạng thái của mẫu phác đồ',
    response: { serialization: TreatmentTemplate },
  })
  async updateTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateTreatmentTemplateDto,
  ) {
    return this.treatmentPlansService.updateTemplate(id, dto);
  }

  // ==========================================
  // PATIENT PLANS
  // ==========================================

  @Post()
  @UseGuards(StaffAuthGuard, StaffRolesGuard)
  @Roles(StaffRole.DOCTOR, StaffRole.ADMIN)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Staff Auth (Doctor) - Lập phác đồ điều trị cho bệnh nhân',
    description: 'Bác sĩ thiết lập phác đồ điều trị (ngày bắt đầu, kết thúc, ghi chú, liên kết mục tiêu)',
    response: { serialization: TreatmentPlan },
  })
  async createPlan(
    @Body() dto: CreateTreatmentPlanDto,
    @CurrentStaff() staff: StaffJwtPayload,
  ) {
    return this.treatmentPlansService.createPlan(dto, staff.id);
  }

  @Get('my-plans')
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'App Auth - Bệnh nhân xem danh sách phác đồ điều trị',
    description: 'Lấy danh sách các phác đồ điều trị của các hồ sơ thuộc tài khoản App',
    response: { serialization: TreatmentPlan, isArray: true },
  })
  async findPlansForApp(
    @Query() query: QueryTreatmentPlanDto,
    @CurrentAccount() account: AppAccountJwtPayload,
  ) {
    return this.treatmentPlansService.findPlans(query, account.id);
  }

  @Get('my-plans/:id')
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'App Auth - Bệnh nhân xem chi tiết phác đồ điều trị',
    description: 'Xem chi tiết thông tin phác đồ, bác sĩ điều trị và mục tiêu kèm theo',
    response: { serialization: TreatmentPlan },
  })
  async findPlanByIdForApp(
    @Param('id') id: string,
    @CurrentAccount() account: AppAccountJwtPayload,
  ) {
    return this.treatmentPlansService.findPlanById(id, account.id);
  }

  @Get()
  @UseGuards(StaffAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Staff Auth - Danh sách phác đồ điều trị trên CMS',
    description: 'Lọc và tìm kiếm danh sách phác đồ điều trị của bệnh nhân',
    response: { serialization: TreatmentPlan, isArray: true },
  })
  async findPlansForStaff(@Query() query: QueryTreatmentPlanDto) {
    return this.treatmentPlansService.findPlans(query);
  }

  @Get(':id')
  @UseGuards(StaffAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Staff Auth - Xem chi tiết phác đồ điều trị trên CMS',
    description: 'Xem chi tiết phác đồ theo ID',
    response: { serialization: TreatmentPlan },
  })
  async findPlanByIdForStaff(@Param('id') id: string) {
    return this.treatmentPlansService.findPlanById(id);
  }

  @Patch(':id')
  @UseGuards(StaffAuthGuard, StaffRolesGuard)
  @Roles(StaffRole.DOCTOR, StaffRole.ADMIN)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Staff Auth (Doctor) - Cập nhật phác đồ điều trị',
    description: 'Bác sĩ điều chỉnh ghi chú, ngày kết thúc hoặc trạng thái phác đồ (ACTIVE, COMPLETED, DISCONTINUED)',
    response: { serialization: TreatmentPlan },
  })
  async updatePlan(
    @Param('id') id: string,
    @Body() dto: UpdateTreatmentPlanDto,
    @CurrentStaff() staff: StaffJwtPayload,
  ) {
    return this.treatmentPlansService.updatePlan(id, dto, staff.id);
  }
}
