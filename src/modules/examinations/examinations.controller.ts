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
  CreateExaminationDto,
  QueryExaminationDto,
  UpdateExaminationDto,
} from './dtos';
import { Examination } from './entities/examination.entity';
import { ExaminationsService } from './examinations.service';

@ApiTags('Examinations (Phiếu Khám Bệnh Lâm Sàng)')
@Controller('examinations')
export class ExaminationsController {
  constructor(private readonly examinationsService: ExaminationsService) {}

  @Post()
  @UseGuards(StaffAuthGuard, StaffRolesGuard)
  @Roles(StaffRole.DOCTOR, StaffRole.ADMIN)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Staff Auth (Doctor) - Tạo mới phiếu khám bệnh',
    description: 'Bác sĩ lập phiếu khám bệnh cho bệnh nhân (chỉ số sinh hiệu, lý do khám, chẩn đoán, mã ICD-10, kế hoạch điều trị)',
    response: { serialization: Examination },
  })
  async create(
    @Body() dto: CreateExaminationDto,
    @CurrentStaff() staff: StaffJwtPayload,
  ) {
    return this.examinationsService.create(dto, staff.id, staff.facilityId);
  }

  @Get('my-records')
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'App Auth - Bệnh nhân xem lịch sử các lần khám bệnh',
    description: 'Bệnh nhân xem danh sách các phiếu khám bệnh thuộc tài khoản của mình',
    response: { serialization: Examination, isArray: true },
  })
  async findAllForApp(
    @Query() query: QueryExaminationDto,
    @CurrentAccount() account: AppAccountJwtPayload,
  ) {
    return this.examinationsService.findAll(query, account.id);
  }

  @Get()
  @UseGuards(StaffAuthGuard, StaffRolesGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Staff Auth - Danh sách phiếu khám bệnh tại cơ sở y tế',
    description: 'Nhân viên y tế tra cứu danh sách phiếu khám theo bác sĩ, cơ sở, mã ICD-10, ngày khám...',
    response: { serialization: Examination, isArray: true },
  })
  async findAllForStaff(
    @Query() query: QueryExaminationDto,
    @CurrentStaff() staff: StaffJwtPayload,
  ) {
    if (staff.role !== StaffRole.ADMIN && !query.facilityId) {
      query.facilityId = staff.facilityId;
    }
    return this.examinationsService.findAll(query);
  }

  @Get('code/:code')
  @UseGuards(StaffAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Staff Auth - Tra cứu phiếu khám bệnh theo mã phiếu',
    description: 'Tìm kiếm nhanh hồ sơ khám bệnh theo mã (ví dụ: EX-20260908-A1B2)',
    response: { serialization: Examination },
  })
  async findByCode(@Param('code') code: string) {
    return this.examinationsService.findByCode(code);
  }

  @Get(':id')
  @UseGuards(StaffAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Staff Auth - Chi tiết phiếu khám bệnh theo ID',
    description: 'Lấy toàn bộ thông tin chi tiết của một lần khám bệnh',
    response: { serialization: Examination },
  })
  async findOne(@Param('id') id: string) {
    return this.examinationsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(StaffAuthGuard, StaffRolesGuard)
  @Roles(StaffRole.DOCTOR, StaffRole.ADMIN)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Staff Auth (Doctor) - Cập nhật thông tin / Hoàn thành phiếu khám',
    description: 'Bác sĩ bổ sung triệu chứng, cập nhật chẩn đoán, phác đồ điều trị hoặc chuyển trạng thái sang COMPLETED',
    response: { serialization: Examination },
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateExaminationDto,
  ) {
    return this.examinationsService.update(id, dto);
  }
}
