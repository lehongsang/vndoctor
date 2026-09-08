import { CurrentStaff, StaffJwtPayload } from '@/commons/decorators/current-staff.decorator';
import { Roles } from '@/commons/decorators/roles.decorator';
import { Doc } from '@/commons/docs/doc.decorator';
import { StaffRole } from '@/commons/enums/vndoctor.enum';
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
import { CarePackagesService } from './care-packages.service';
import {
  CreateCarePackageDto,
  QueryCarePackageDto,
  UpdateCarePackageDto,
  UpdateCarePackageStatusDto,
} from './dtos';
import { CarePackage } from './entities/care-package.entity';

/**
 * Controller exposing REST API endpoints for Care Packages.
 */
@ApiTags('Care Packages (Gói Dịch Vụ Chăm Sóc Sức Khỏe)')
@Controller('care-packages')
export class CarePackagesController {
  constructor(private readonly carePackagesService: CarePackagesService) {}

  @Post()
  @UseGuards(StaffAuthGuard, StaffRolesGuard)
  @Roles(StaffRole.ADMIN)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Facility Admin Auth - Tạo mới gói chăm sóc sức khỏe',
    description: 'Chỉ có Admin của cơ sở y tế mới có quyền tạo gói chăm sóc (Tiêu chuẩn/VIP, thời hạn, giá, quyền lợi)',
    response: { serialization: CarePackage },
  })
  async create(
    @Body() dto: CreateCarePackageDto,
    @CurrentStaff() staff: StaffJwtPayload,
  ): Promise<CarePackage> {
    return this.carePackagesService.create(dto, staff.facilityId);
  }

  @Get()
  @Doc({
    summary: 'Public / All - Danh sách gói chăm sóc sức khỏe',
    description: 'Lấy danh sách các gói chăm sóc có phân trang, lọc theo cơ sở y tế, loại gói (STANDARD/VIP), trạng thái (ACTIVE/INACTIVE) và tìm kiếm',
    response: { serialization: CarePackage, isArray: true },
  })
  async findAll(@Query() query: QueryCarePackageDto) {
    return this.carePackagesService.findAll(query);
  }

  @Get(':id')
  @Doc({
    summary: 'Public / All - Xem chi tiết gói chăm sóc sức khỏe',
    description: 'Lấy thông tin chi tiết của một gói chăm sóc theo ID kèm thông tin cơ sở y tế phát hành',
    response: { serialization: CarePackage },
  })
  async findById(@Param('id') id: string): Promise<CarePackage> {
    return this.carePackagesService.findById(id);
  }

  @Patch(':id')
  @UseGuards(StaffAuthGuard, StaffRolesGuard)
  @Roles(StaffRole.ADMIN)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Facility Admin Auth - Chỉnh sửa thông tin gói chăm sóc',
    description: 'Chỉ Admin của cơ sở y tế sở hữu gói mới có quyền cập nhật thông tin',
    response: { serialization: CarePackage },
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCarePackageDto,
    @CurrentStaff() staff: StaffJwtPayload,
  ): Promise<CarePackage> {
    return this.carePackagesService.update(id, dto, staff.facilityId);
  }

  @Patch(':id/status')
  @UseGuards(StaffAuthGuard, StaffRolesGuard)
  @Roles(StaffRole.ADMIN)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Facility Admin Auth - Đổi trạng thái kích hoạt gói chăm sóc',
    description: 'Bật (ACTIVE) hoặc Tắt (INACTIVE) trạng thái hoạt động của gói chăm sóc',
    response: { serialization: CarePackage },
  })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateCarePackageStatusDto,
    @CurrentStaff() staff: StaffJwtPayload,
  ): Promise<CarePackage> {
    return this.carePackagesService.updateStatus(id, dto.status, staff.facilityId);
  }
}
