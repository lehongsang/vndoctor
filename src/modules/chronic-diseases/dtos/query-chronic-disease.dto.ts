import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { GetManyBaseQueryParams } from '@/commons/dtos/get-many-base.dto';

export class QueryChronicDiseaseDto extends PartialType(GetManyBaseQueryParams) {
  @ApiPropertyOptional({ description: 'Lọc theo nhóm bệnh (category)' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ description: 'Lọc theo trạng thái hoạt động' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;
}
