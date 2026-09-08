import { GetManyBaseQueryParams } from '@/commons/dtos/get-many-base.dto';
import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class QueryTreatmentDictionaryDto extends PartialType(GetManyBaseQueryParams) {
  @ApiPropertyOptional({ description: 'Tìm kiếm theo mã (code) hoặc nội dung từ điển' })
  @IsString()
  @IsOptional()
  search?: string;
}
