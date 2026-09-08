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
import { ChronicDiseasesService } from './chronic-diseases.service';
import {
  CreateChronicDiseaseDto,
  QueryChronicDiseaseDto,
  SetProfileChronicDiseasesDto,
  UpdateChronicDiseaseDto,
} from './dtos';
import { Doc } from '@/commons/docs/doc.decorator';
import { ChronicDisease } from './entities/chronic-disease.entity';
import { ProfileChronicDisease } from './entities/profile-chronic-disease.entity';
import { StaffAuthGuard } from '@/commons/guards/staff-auth.guard';
import { StaffRolesGuard } from '@/commons/guards/staff-roles.guard';
import { Roles } from '@/commons/decorators/roles.decorator';
import { StaffRole } from '@/commons/enums/vndoctor.enum';
import { Public } from '@/commons/decorators/public.decorator';

@ApiTags('Chronic Diseases (Danh mục Bệnh mạn tính)')
@Controller('chronic-diseases')
export class ChronicDiseasesController {
  constructor(
    private readonly chronicDiseasesService: ChronicDiseasesService,
  ) {}

  @Public()
  @Get()
  @Doc({
    summary: 'Public / App / CMS - Danh sách danh mục bệnh mạn tính',
    description: 'Lấy danh sách các bệnh mạn tính chuẩn ICD-10 (Tăng huyết áp, Đái tháo đường, Mỡ máu...)',
  })
  async getChronicDiseases(@Query() query: QueryChronicDiseaseDto) {
    return this.chronicDiseasesService.getChronicDiseases(query);
  }

  @Public()
  @Get('profile/:healthProfileId')
  @Doc({
    summary: 'Public / App / CMS - Lấy danh sách bệnh nền của một hồ sơ sức khỏe',
    description: 'Trả về các bệnh mạn tính đã gán cho một hồ sơ sức khỏe bệnh nhân',
    response: { serialization: ChronicDisease, isArray: true },
  })
  async getProfileDiseases(@Param('healthProfileId') healthProfileId: string) {
    return this.chronicDiseasesService.getProfileDiseases(healthProfileId);
  }

  @Public()
  @Put('profile/:healthProfileId')
  @Doc({
    summary: 'App / CMS - Cập nhật danh sách bệnh nền cho hồ sơ sức khỏe',
    description: 'Gán mảng UUID các bệnh mạn tính vào hồ sơ sức khỏe bệnh nhân',
    response: { serialization: ProfileChronicDisease },
  })
  async setProfileDiseases(
    @Param('healthProfileId') healthProfileId: string,
    @Body() dto: SetProfileChronicDiseasesDto,
  ) {
    return this.chronicDiseasesService.setProfileDiseases(
      healthProfileId,
      dto.diseaseIds,
    );
  }

  @Public()
  @Get(':id')
  @Doc({
    summary: 'Public / App / CMS - Chi tiết bệnh mạn tính theo ID',
    description: 'Lấy thông tin chi tiết một bệnh mạn tính theo UUID',
    response: { serialization: ChronicDisease },
  })
  async getChronicDiseaseById(@Param('id') id: string) {
    return this.chronicDiseasesService.getChronicDiseaseById(id);
  }

  @Post()
  @UseGuards(StaffAuthGuard, StaffRolesGuard)
  @Roles(StaffRole.ADMIN)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Role: ADMIN - Thêm mới bệnh mạn tính vào danh mục',
    description: 'Thêm mới mã bệnh và mã ICD-10 vào danh mục chuẩn của hệ thống',
    response: { serialization: ChronicDisease },
  })
  async createChronicDisease(@Body() dto: CreateChronicDiseaseDto) {
    return this.chronicDiseasesService.createChronicDisease(dto);
  }

  @Patch(':id')
  @UseGuards(StaffAuthGuard, StaffRolesGuard)
  @Roles(StaffRole.ADMIN)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Role: ADMIN - Cập nhật thông tin bệnh mạn tính',
    description: 'Chỉnh sửa tên bệnh, mã ICD-10, nhóm bệnh hoặc trạng thái',
    response: { serialization: ChronicDisease },
  })
  async updateChronicDisease(
    @Param('id') id: string,
    @Body() dto: UpdateChronicDiseaseDto,
  ) {
    return this.chronicDiseasesService.updateChronicDisease(id, dto);
  }
}
