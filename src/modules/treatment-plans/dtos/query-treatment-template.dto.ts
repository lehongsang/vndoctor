import { GetManyBaseQueryParams } from '@/commons/dtos/get-many-base.dto';
import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class QueryTreatmentTemplateDto extends PartialType(GetManyBaseQueryParams) {
  @ApiPropertyOptional({ description: 'Filter by Facility ID' })
  @IsUUID()
  @IsOptional()
  facilityId?: string;

  @ApiPropertyOptional({ description: 'Filter by Disease Category' })
  @IsString()
  @IsOptional()
  diseaseCategory?: string;

  @ApiPropertyOptional({ description: 'Filter by Active status' })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;
}
