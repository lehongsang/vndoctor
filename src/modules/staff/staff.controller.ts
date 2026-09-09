import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { StaffService } from './staff.service';
import {
  ChangeStaffPasswordDto,
  CreateStaffDto,
  QueryStaffDto,
  UpdateMyProfileDto,
  UpdateStaffDto,
} from './dtos';
import { Doc } from '@/commons/docs/doc.decorator';
import { StaffUser } from './entities/staff-user.entity';
import { StaffAuthGuard } from '@/commons/guards/staff-auth.guard';
import { StaffRolesGuard } from '@/commons/guards/staff-roles.guard';
import { Roles } from '@/commons/decorators/roles.decorator';
import { StaffRole } from '@/commons/enums/vndoctor.enum';
import { CurrentStaff, StaffJwtPayload } from '@/commons/decorators/current-staff.decorator';

@ApiTags('Staff & Doctors (Nhân viên y tế & Bác sĩ)')
@ApiBearerAuth('access-token')
@UseGuards(StaffAuthGuard, StaffRolesGuard)
@Controller('staff')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post()
  @Roles(StaffRole.VNDOCTOR_ADMIN, StaffRole.ADMIN)
  @Doc({
    summary: 'Role: VNDOCTOR_ADMIN / ADMIN - Tạo tài khoản Bác sĩ / Nhân sự y tế',
    description:
      'VNDOCTOR_ADMIN hoặc FacilityAdmin tạo tài khoản cho bác sĩ/nhân sự. Email là bắt buộc, mật khẩu mặc định tự động là vndoctor123 nếu không truyền.',
    response: { serialization: StaffUser },
  })
  async createStaff(
    @Body() dto: CreateStaffDto,
    @CurrentStaff() staff: StaffJwtPayload,
  ) {
    return this.staffService.createStaff(dto, staff);
  }

  @Get()
  @Roles(StaffRole.VNDOCTOR_ADMIN, StaffRole.ADMIN, StaffRole.DOCTOR, StaffRole.DOCTOR_EXPERT, StaffRole.NURSE, StaffRole.STAFF)
  @Doc({
    summary: 'Role: Tất cả nhân viên - Danh sách nhân sự',
    description: 'Lấy danh sách nhân viên theo cơ sở y tế, vai trò hoặc tìm kiếm theo tên/mã CCHN/email',
  })
  async getStaffList(@Query() query: QueryStaffDto) {
    return this.staffService.getStaffList(query);
  }

  @Get('me')
  @Roles(StaffRole.VNDOCTOR_ADMIN, StaffRole.ADMIN, StaffRole.DOCTOR, StaffRole.DOCTOR_EXPERT, StaffRole.NURSE, StaffRole.STAFF)
  @Doc({
    summary: 'Role: Tất cả nhân sự - Thông tin cá nhân đang đăng nhập',
    description: 'Lấy thông tin chi tiết của nhân viên y tế đang đăng nhập',
    response: { serialization: StaffUser },
  })
  async getMyProfile(@CurrentStaff() staff: StaffJwtPayload) {
    return this.staffService.getStaffById(staff.id);
  }

  @Patch('me')
  @Roles(StaffRole.VNDOCTOR_ADMIN, StaffRole.ADMIN, StaffRole.DOCTOR, StaffRole.DOCTOR_EXPERT, StaffRole.NURSE, StaffRole.STAFF)
  @Doc({
    summary: 'Role: Tất cả nhân sự - Tự cập nhật thông tin cá nhân',
    description: 'Bác sĩ/nhân viên y tế tự cập nhật họ tên, SĐT, chuyên khoa hoặc email',
    response: { serialization: StaffUser },
  })
  async updateMyProfile(
    @CurrentStaff() staff: StaffJwtPayload,
    @Body() dto: UpdateMyProfileDto,
  ) {
    return this.staffService.updateMyProfile(staff.id, dto);
  }

  @Get(':id')
  @Roles(StaffRole.VNDOCTOR_ADMIN, StaffRole.ADMIN, StaffRole.DOCTOR, StaffRole.DOCTOR_EXPERT, StaffRole.NURSE, StaffRole.STAFF)
  @Doc({
    summary: 'Role: Tất cả nhân viên - Chi tiết nhân viên theo ID',
    description: 'Lấy thông tin chi tiết một nhân viên y tế',
    response: { serialization: StaffUser },
  })
  async getStaffById(@Param('id') id: string) {
    return this.staffService.getStaffById(id);
  }

  @Patch(':id')
  @Roles(StaffRole.VNDOCTOR_ADMIN, StaffRole.ADMIN)
  @Doc({
    summary: 'Role: VNDOCTOR_ADMIN / ADMIN - Quản trị viên cập nhật thông tin nhân sự',
    description: 'Admin cập nhật họ tên, vai trò, chuyên khoa, email, SĐT hoặc trạng thái của nhân viên',
    response: { serialization: StaffUser },
  })
  async updateStaff(@Param('id') id: string, @Body() dto: UpdateStaffDto) {
    return this.staffService.updateStaff(id, dto);
  }

  @Put('change-password')
  @Roles(StaffRole.VNDOCTOR_ADMIN, StaffRole.ADMIN, StaffRole.DOCTOR, StaffRole.DOCTOR_EXPERT, StaffRole.NURSE, StaffRole.STAFF)
  @Doc({
    summary: 'Role: Tất cả nhân sự - Tự đổi mật khẩu',
    description: 'Thay đổi mật khẩu cá nhân (sau lần đầu đăng nhập với mật khẩu mặc định vndoctor123)',
  })
  async changePassword(
    @CurrentStaff() staff: StaffJwtPayload,
    @Body() dto: ChangeStaffPasswordDto,
  ) {
    return this.staffService.changePassword(staff.id, dto);
  }
}
