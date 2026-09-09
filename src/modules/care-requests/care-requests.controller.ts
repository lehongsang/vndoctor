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
import { CareRequestsService } from './care-requests.service';
import {
  AssignCareRequestDto,
  CreateCareRequestDto,
  QueryCareRequestDto,
  ResolveCareRequestDto,
  UpdateCareRequestStatusDto,
} from './dtos';
import { PatientCareRequest } from './entities/care-request.entity';

/**
 * REST API Controller for managing Patient Care Requests and Care Team resolutions.
 */
@ApiTags('Care Requests (Yêu Cầu Hỗ Trợ Chăm Sóc Y Tế)')
@Controller('care-requests')
export class CareRequestsController {
  constructor(private readonly careRequestsService: CareRequestsService) {}

  @Post()
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'App Auth - Bệnh nhân gửi yêu cầu hỗ trợ chăm sóc mới',
    description: 'Bệnh nhân đang sử dụng gói chăm sóc (ACTIVE) gửi triệu chứng, câu hỏi hoặc ảnh đính kèm. Hệ thống tự động gán Điều dưỡng và đồng bộ tin nhắn vào phòng chat nhóm Care Team.',
    response: { serialization: PatientCareRequest },
  })
  async create(
    @Body() dto: CreateCareRequestDto,
    @CurrentAccount() account: AppAccountJwtPayload,
  ): Promise<PatientCareRequest> {
    return this.careRequestsService.create(dto, account.id);
  }

  @Get('me')
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'App Auth - Lấy lịch sử yêu cầu hỗ trợ của Bệnh nhân',
    description: 'Trả về danh sách các phiếu yêu cầu chăm sóc của tài khoản App đang đăng nhập kèm trạng thái xử lý.',
    response: { serialization: PatientCareRequest, isArray: true },
  })
  async getMyRequests(
    @Query() query: QueryCareRequestDto,
    @CurrentAccount() account: AppAccountJwtPayload,
  ) {
    return this.careRequestsService.findAll(query, undefined, account.id);
  }

  @Get()
  @UseGuards(StaffAuthGuard, StaffRolesGuard)
  @Roles(StaffRole.ADMIN, StaffRole.DOCTOR, StaffRole.NURSE, StaffRole.STAFF)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'CMS Staff Auth - Danh sách yêu cầu chăm sóc theo cơ sở y tế',
    description: 'Nhân viên y tế xem danh sách các yêu cầu chăm sóc có phân trang, lọc theo trạng thái (PENDING/IN_PROGRESS/RESOLVED), nhân sự phụ trách và tìm kiếm.',
    response: { serialization: PatientCareRequest, isArray: true },
  })
  async findAll(
    @Query() query: QueryCareRequestDto,
    @CurrentStaff() staff: StaffJwtPayload,
  ) {
    return this.careRequestsService.findAll(query, staff.facilityId);
  }

  @Get(':id')
  @UseGuards(StaffAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Staff Auth - Xem chi tiết yêu cầu chăm sóc y tế',
    description: 'Lấy chi tiết yêu cầu bao gồm thông tin gói, hồ sơ bệnh nhân, hình ảnh và lịch sử phản hồi.',
    response: { serialization: PatientCareRequest },
  })
  async findById(
    @Param('id') id: string,
    @CurrentStaff() staff: StaffJwtPayload,
  ): Promise<PatientCareRequest> {
    return this.careRequestsService.findById(id, staff.facilityId);
  }

  @Patch(':id/assign')
  @UseGuards(StaffAuthGuard, StaffRolesGuard)
  @Roles(StaffRole.ADMIN, StaffRole.DOCTOR, StaffRole.NURSE)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'CMS Staff - Tiếp nhận ca / Phân công / Chuyển ca sang Bác sĩ',
    description: 'Điều dưỡng tiếp nhận ca hoặc chuyển ca (Escalate) sang Bác sĩ chuyên môn. Hệ thống tự động gửi thông báo cập nhật vào phòng chat nhóm.',
    response: { serialization: PatientCareRequest },
  })
  async assignStaff(
    @Param('id') id: string,
    @Body() dto: AssignCareRequestDto,
    @CurrentStaff() staff: StaffJwtPayload,
  ): Promise<PatientCareRequest> {
    return this.careRequestsService.assignStaff(id, dto, staff.facilityId);
  }

  @Patch(':id/status')
  @UseGuards(StaffAuthGuard, StaffRolesGuard)
  @Roles(StaffRole.ADMIN, StaffRole.DOCTOR, StaffRole.NURSE)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'CMS Staff - Cập nhật trạng thái xử lý của yêu cầu',
    description: 'Chuyển trạng thái yêu cầu sang IN_PROGRESS hoặc CANCELLED.',
    response: { serialization: PatientCareRequest },
  })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateCareRequestStatusDto,
    @CurrentStaff() staff: StaffJwtPayload,
  ): Promise<PatientCareRequest> {
    return this.careRequestsService.updateStatus(id, dto, staff.facilityId);
  }

  @Post(':id/resolve')
  @UseGuards(StaffAuthGuard, StaffRolesGuard)
  @Roles(StaffRole.ADMIN, StaffRole.DOCTOR, StaffRole.NURSE)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'CMS Staff - Bác sĩ/Điều dưỡng chốt kết luận y tế và hoàn tất yêu cầu',
    description: 'Nhập nội dung kết luận xử lý y khoa, chuyển trạng thái sang RESOLVED và tự động đồng bộ kết quả vào nhóm chat Care Team.',
    response: { serialization: PatientCareRequest },
  })
  async resolve(
    @Param('id') id: string,
    @Body() dto: ResolveCareRequestDto,
    @CurrentStaff() staff: StaffJwtPayload,
  ): Promise<PatientCareRequest> {
    return this.careRequestsService.resolve(id, dto, staff.facilityId, staff.id);
  }
}
