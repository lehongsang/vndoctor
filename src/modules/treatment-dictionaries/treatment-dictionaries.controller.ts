import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { TreatmentDictionariesService } from './treatment-dictionaries.service';
import { QueryTreatmentDictionaryDto } from './dtos';
import { Doc } from '@/commons/docs/doc.decorator';
import { Public } from '@/commons/decorators/public.decorator';
import { TreatmentTargetDictionary } from './entities/treatment-target-dictionary.entity';

@ApiTags('Treatment Dictionaries (Từ điển Mục tiêu điều trị A1-G5)')
@Controller('treatment-dictionaries')
export class TreatmentDictionariesController {
  constructor(
    private readonly treatmentDictionariesService: TreatmentDictionariesService,
  ) {}

  @Public()
  @Get()
  @Doc({
    summary: 'Public / App / CMS - Danh sách từ điển mục tiêu điều trị (A1 -> G5)',
    description: 'Tra cứu danh mục tiêu chuẩn mục tiêu điều trị theo phân tầng nguy cơ tim mạch và chuyển hóa',
  })
  async findAll(@Query() query: QueryTreatmentDictionaryDto) {
    return this.treatmentDictionariesService.findAll(query);
  }

  @Public()
  @Get(':code')
  @Doc({
    summary: 'Public / App / CMS - Chi tiết một mã mục tiêu điều trị',
    description: 'Lấy thông tin chi tiết mục tiêu huyết áp, mỡ máu, HbA1c, BMI, lời khuyên ăn uống, vận động theo mã (A1, B2, C3...)',
    response: { serialization: TreatmentTargetDictionary },
  })
  async findOne(@Param('code') code: string) {
    return this.treatmentDictionariesService.findOne(code);
  }
}
