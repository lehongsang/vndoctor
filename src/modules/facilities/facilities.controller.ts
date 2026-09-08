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
import { FacilitiesService } from './facilities.service';
import { CreateFacilityDto, QueryFacilityDto, UpdateFacilityDto } from './dtos';
import { Doc } from '@/commons/docs/doc.decorator';
import { Facility } from './entities/facility.entity';
import { StaffAuthGuard } from '@/commons/guards/staff-auth.guard';
import { StaffRolesGuard } from '@/commons/guards/staff-roles.guard';
import { Roles } from '@/commons/decorators/roles.decorator';
import { StaffRole } from '@/commons/enums/vndoctor.enum';
import { CurrentStaff, StaffJwtPayload } from '@/commons/decorators/current-staff.decorator';

@ApiTags('Facilities (Cơ sở y tế & Phân cấp)')
@ApiBearerAuth('access-token')
@UseGuards(StaffAuthGuard, StaffRolesGuard)
@Controller('facilities')
export class FacilitiesController {
  constructor(private readonly facilitiesService: FacilitiesService) {}

  @Post()
  @Roles(StaffRole.ADMIN)
  @Doc({
    summary: 'Role: ADMIN / FacilityAdmin - Tạo mới cơ sở y tế (Hỗ trợ phân cấp)',
    description:
      'Đăng ký một cơ sở mới. Nếu là FacilityAdmin của viện X, hệ thống sẽ tự động gán cơ sở mới trực thuộc viện X.',
    response: { serialization: Facility },
  })
  async createFacility(
    @Body() dto: CreateFacilityDto,
    @CurrentStaff() staff: StaffJwtPayload,
  ) {
    return this.facilitiesService.createFacility(dto, staff);
  }

  @Get()
  @Roles(StaffRole.ADMIN, StaffRole.DOCTOR, StaffRole.NURSE, StaffRole.STAFF)
  @Doc({
    summary: 'Role: Tất cả nhân viên - Danh sách cơ sở y tế',
    description: 'Tìm kiếm, phân trang và lọc theo cấp bậc (facilityType) hoặc cơ sở cha (parentId)',
  })
  async getFacilities(@Query() query: QueryFacilityDto) {
    return this.facilitiesService.getFacilities(query);
  }

  @Get('hierarchy/tree')
  @Roles(StaffRole.ADMIN, StaffRole.DOCTOR, StaffRole.NURSE, StaffRole.STAFF)
  @Doc({
    summary: 'Role: Tất cả nhân sự - Cây phân cấp cơ sở y tế',
    description: 'Lấy toàn bộ cây phả hệ mạng lưới cơ sở y tế từ cấp cao nhất xuống xã/phòng khám',
  })
  async getFacilityTree(@Query('rootId') rootId?: string) {
    return this.facilitiesService.getFacilityTree(rootId);
  }

  @Get(':id/children')
  @Roles(StaffRole.ADMIN, StaffRole.DOCTOR, StaffRole.NURSE, StaffRole.STAFF)
  @Doc({
    summary: 'Role: Tất cả nhân sự - Danh sách cơ sở con trực thuộc',
    description: 'Lấy danh sách các cơ sở y tế cấp dưới trực tiếp thuộc quản lý của một cơ sở cha',
  })
  async getChildrenFacilities(@Param('id') id: string) {
    return this.facilitiesService.getChildrenFacilities(id);
  }

  @Get(':id')
  @Roles(StaffRole.ADMIN, StaffRole.DOCTOR, StaffRole.NURSE, StaffRole.STAFF)
  @Doc({
    summary: 'Role: Tất cả nhân viên - Chi tiết cơ sở y tế theo ID',
    description: 'Lấy thông tin chi tiết một cơ sở y tế kèm thông tin cơ sở cha và danh sách cơ sở con',
    response: { serialization: Facility },
  })
  async getFacilityById(@Param('id') id: string) {
    return this.facilitiesService.getFacilityById(id);
  }

  @Patch(':id')
  @Roles(StaffRole.ADMIN)
  @Doc({
    summary: 'Role: ADMIN - Cập nhật thông tin cơ sở y tế',
    description: 'Chỉnh sửa tên, địa chỉ, số điện thoại hoặc trạng thái hoạt động',
    response: { serialization: Facility },
  })
  async updateFacility(@Param('id') id: string, @Body() dto: UpdateFacilityDto) {
    return this.facilitiesService.updateFacility(id, dto);
  }
}
