import { AppAccountJwtPayload, CurrentAccount } from '@/commons/decorators/current-account.decorator';
import { Doc } from '@/commons/docs/doc.decorator';
import { AppAuthGuard } from '@/commons/guards/app-auth.guard';
import { HealthMetricType } from '@/commons/enums/vndoctor.enum';
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { CreateHealthRecordDto, QueryHealthRecordDto, UpdateHealthRecordDto } from './dtos';
import { HealthRecord } from './entities/health-record.entity';
import { HealthRecordsService } from './health-records.service';

@ApiTags('Health Records (Theo dõi Chỉ số Sức khỏe Cá nhân)')
@Controller('health-records')
export class HealthRecordsController {
  constructor(private readonly healthRecordsService: HealthRecordsService) {}

  @Post()
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'App Auth - Ghi nhận chỉ số sức khỏe mới',
    description: 'Bệnh nhân tự ghi nhận đo lường chỉ số huyết áp, đường huyết, cân nặng, SpO2, nhiệt độ...',
    response: { serialization: HealthRecord },
  })
  async create(
    @Body() dto: CreateHealthRecordDto,
    @CurrentAccount() account: AppAccountJwtPayload,
  ) {
    return this.healthRecordsService.create(dto, account.id);
  }

  @Get()
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'App Auth - Lấy lịch sử đo lường chỉ số theo dõi',
    description: 'Lấy danh sách các bản ghi đo lường chỉ số theo dõi có phân trang và bộ lọc theo loại chỉ số, khoảng thời gian',
    response: { serialization: HealthRecord, isArray: true },
  })
  async findAll(
    @Query() query: QueryHealthRecordDto,
    @CurrentAccount() account: AppAccountJwtPayload,
  ) {
    return this.healthRecordsService.findAll(query, account.id);
  }

  @Get('summary/:healthProfileId')
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiQuery({
    name: 'metricType',
    enum: HealthMetricType,
    enumName: 'HealthMetricType',
    required: false,
    description: 'Tùy chọn lọc lấy riêng một loại chỉ số (ví dụ BLOOD_PRESSURE). Nếu không truyền sẽ lấy tất cả các chỉ số.',
  })
  @Doc({
    summary: 'App Auth - Lấy tóm tắt các chỉ số mới nhất của hồ sơ (hoặc từng chỉ số)',
    description: 'Trả về giá trị đo lường gần nhất cho từng loại chỉ số hoặc riêng loại chỉ số được chỉ định',
  })
  async getLatestSummary(
    @Param('healthProfileId') healthProfileId: string,
    @CurrentAccount() account: AppAccountJwtPayload,
    @Query('metricType') metricType?: HealthMetricType,
  ) {
    return this.healthRecordsService.getLatestSummary(healthProfileId, metricType, account.id);
  }

  @Get(':id')
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'App Auth - Lấy chi tiết một bản ghi chỉ số sức khỏe',
    description: 'Xem chi tiết giá trị đo lường và ghi chú ngữ cảnh',
    response: { serialization: HealthRecord },
  })
  async findOne(
    @Param('id') id: string,
    @CurrentAccount() account: AppAccountJwtPayload,
  ) {
    return this.healthRecordsService.findOne(id, account.id);
  }

  @Patch(':id')
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'App Auth - Chỉnh sửa bản ghi chỉ số sức khỏe',
    description: 'Cập nhật lại giá trị đo lường hoặc ghi chú của bản ghi cá nhân',
    response: { serialization: HealthRecord },
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateHealthRecordDto,
    @CurrentAccount() account: AppAccountJwtPayload,
  ) {
    return this.healthRecordsService.update(id, dto, account.id);
  }

  @Delete(':id')
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'App Auth - Xóa bản ghi chỉ số sức khỏe',
    description: 'Xóa một bản ghi đo lường cá nhân',
  })
  async remove(
    @Param('id') id: string,
    @CurrentAccount() account: AppAccountJwtPayload,
  ) {
    return this.healthRecordsService.remove(id, account.id);
  }
}
