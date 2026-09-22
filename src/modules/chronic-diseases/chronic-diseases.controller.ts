import {
  Body,
  Controller,
  Delete,
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
  ChronicDiseaseResponseDto,
  CreateChronicDiseaseDto,
  QueryChronicDiseaseDto,
  SetProfileChronicDiseasesDto,
  UpdateChronicDiseaseDto,
} from './dtos';
import { Doc } from '@/commons/docs/doc.decorator';
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
    description:
      'Lấy danh sách các bệnh mạn tính chuẩn ICD-10 (Tăng huyết áp, Đái tháo đường, Mỡ máu...), trả về các trường cốt lõi: id, code, name, icd10Code.',
  })
  async getChronicDiseases(@Query() query: QueryChronicDiseaseDto) {
    return this.chronicDiseasesService.getChronicDiseases(query);
  }

  @Public()
  @Get('profile/:healthProfileId')
  @Doc({
    summary: 'Public / App / CMS - Lấy danh sách bệnh nền của một hồ sơ sức khỏe',
    description:
      'Trả về các bệnh mạn tính đã gán cho một hồ sơ sức khỏe bệnh nhân (chỉ gồm: id, code, name, icd10Code)',
    response: { serialization: ChronicDiseaseResponseDto, isArray: true },
  })
  async getProfileDiseases(
    @Param('healthProfileId') healthProfileId: string,
  ): Promise<ChronicDiseaseResponseDto[]> {
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
    description:
      'Lấy thông tin chi tiết một bệnh mạn tính theo UUID (chỉ gồm: id, code, name, icd10Code)',
    response: { serialization: ChronicDiseaseResponseDto },
  })
  async getChronicDiseaseById(
    @Param('id') id: string,
  ): Promise<ChronicDiseaseResponseDto> {
    return this.chronicDiseasesService.getChronicDiseaseById(id);
  }

  @Post()
  @UseGuards(StaffAuthGuard, StaffRolesGuard)
  @Roles(StaffRole.ADMIN)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Role: ADMIN - Thêm mới bệnh mạn tính vào danh mục',
    description:
      'Thêm mới mã bệnh và mã ICD-10 vào danh mục chuẩn của hệ thống (trả về: id, code, name, icd10Code)',
    response: { serialization: ChronicDiseaseResponseDto },
  })
  async createChronicDisease(
    @Body() dto: CreateChronicDiseaseDto,
  ): Promise<ChronicDiseaseResponseDto> {
    return this.chronicDiseasesService.createChronicDisease(dto);
  }

  @Patch(':id')
  @UseGuards(StaffAuthGuard, StaffRolesGuard)
  @Roles(StaffRole.ADMIN)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Role: ADMIN - Cập nhật thông tin bệnh mạn tính',
    description:
      'Chỉnh sửa thông tin bệnh mạn tính (trả về: id, code, name, icd10Code)',
    response: { serialization: ChronicDiseaseResponseDto },
  })
  async updateChronicDisease(
    @Param('id') id: string,
    @Body() dto: UpdateChronicDiseaseDto,
  ): Promise<ChronicDiseaseResponseDto> {
    return this.chronicDiseasesService.updateChronicDisease(id, dto);
  }

  @Delete(':id')
  @UseGuards(StaffAuthGuard, StaffRolesGuard)
  @Roles(StaffRole.ADMIN)
  @ApiBearerAuth('access-token')
  @Doc({
    summary: 'Role: ADMIN - Xóa mềm bệnh mạn tính',
    description: 'Xóa mềm bệnh mạn tính khỏi danh mục hoạt động',
  })
  async deleteChronicDisease(@Param('id') id: string) {
    return this.chronicDiseasesService.deleteChronicDisease(id);
  }
}
