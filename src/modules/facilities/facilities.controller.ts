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
  @Roles(StaffRole.VNDOCTOR_ADMIN, StaffRole.ADMIN)
  @Doc({
    summary: 'Role: VNDOCTOR_ADMIN / ADMIN - Tạo mới cơ sở y tế (Trung ương & Phân cấp)',
    description:
      'Đăng ký một cơ sở mới. VNDOCTOR_ADMIN có thể tạo cơ sở tuyến trung ương (parentId null) hoặc bất kỳ tuyến nào. FacilityAdmin chỉ có thể tạo cơ sở con trực thuộc.',
    response: { serialization: Facility },
  })
  async createFacility(
    @Body() dto: CreateFacilityDto,
    @CurrentStaff() staff: StaffJwtPayload,
  ) {
    return this.facilitiesService.createFacility(dto, staff);
  }

  @Get()
  @Roles(StaffRole.VNDOCTOR_ADMIN, StaffRole.ADMIN, StaffRole.DOCTOR, StaffRole.DOCTOR_EXPERT, StaffRole.NURSE, StaffRole.STAFF)
  @Doc({
    summary: 'Role: Tất cả nhân viên - Danh sách cơ sở y tế',
    description: 'Tìm kiếm, phân trang và lọc theo cấp bậc (facilityType), cơ sở cha (parentId), hoặc tuyến trung ương (isRoot)',
  })
  async getFacilities(@Query() query: QueryFacilityDto) {
    return this.facilitiesService.getFacilities(query);
  }

  @Get('hierarchy/tree')
  @Roles(StaffRole.VNDOCTOR_ADMIN, StaffRole.ADMIN, StaffRole.DOCTOR, StaffRole.DOCTOR_EXPERT, StaffRole.NURSE, StaffRole.STAFF)
  @Doc({
    summary: 'Role: Tất cả nhân sự - Cây phân cấp cơ sở y tế',
    description: 'Lấy toàn bộ cây phả hệ mạng lưới cơ sở y tế từ cấp cao nhất xuống xã/phòng khám (hỗ trợ lọc theo rootId và trạng thái)',
  })
  async getFacilityTree(
    @Query('rootId') rootId?: string,
    @Query('isActive') isActive?: boolean,
  ) {
    return this.facilitiesService.getFacilityTree(rootId, isActive);
  }

  @Get(':id/children')
  @Roles(StaffRole.VNDOCTOR_ADMIN, StaffRole.ADMIN, StaffRole.DOCTOR, StaffRole.DOCTOR_EXPERT, StaffRole.NURSE, StaffRole.STAFF)
  @Doc({
    summary: 'Role: Tất cả nhân sự - Danh sách cơ sở con trực thuộc',
    description: 'Lấy danh sách các cơ sở y tế cấp dưới trực tiếp thuộc quản lý của một cơ sở cha (hỗ trợ tìm kiếm, phân trang và lọc theo cấp bậc/trạng thái)',
  })
  async getChildrenFacilities(
    @Param('id') id: string,
    @Query() query: QueryFacilityDto,
  ) {
    return this.facilitiesService.getChildrenFacilities(id, query);
  }

  @Get(':id')
  @Roles(StaffRole.VNDOCTOR_ADMIN, StaffRole.ADMIN, StaffRole.DOCTOR, StaffRole.DOCTOR_EXPERT, StaffRole.NURSE, StaffRole.STAFF)
  @Doc({
    summary: 'Role: Tất cả nhân viên - Chi tiết cơ sở y tế theo ID',
    description: 'Lấy thông tin chi tiết một cơ sở y tế kèm thông tin cơ sở cha và danh sách cơ sở con',
    response: { serialization: Facility },
  })
  async getFacilityById(@Param('id') id: string) {
    return this.facilitiesService.getFacilityById(id);
  }

  @Patch(':id')
  @Roles(StaffRole.VNDOCTOR_ADMIN, StaffRole.ADMIN)
  @Doc({
    summary: 'Role: VNDOCTOR_ADMIN / ADMIN - Cập nhật thông tin cơ sở y tế',
    description: 'Chỉnh sửa tên, địa chỉ, số điện thoại hoặc trạng thái hoạt động',
    response: { serialization: Facility },
  })
  async updateFacility(@Param('id') id: string, @Body() dto: UpdateFacilityDto) {
    return this.facilitiesService.updateFacility(id, dto);
  }
}
