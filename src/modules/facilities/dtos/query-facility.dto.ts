import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';
import { GetManyBaseQueryParams } from '@/commons/dtos/get-many-base.dto';
import { FacilityType } from '@/commons/enums/vndoctor.enum';

export class QueryFacilityDto extends PartialType(GetManyBaseQueryParams) {
  @ApiPropertyOptional({
    enum: FacilityType,
    enumName: 'FacilityType',
    description: 'Lọc theo cấp cơ sở y tế',
  })
  @IsEnum(FacilityType)
  @IsOptional()
  facilityType?: FacilityType;

  @ApiPropertyOptional({
    description: 'Lọc các cơ sở con trực thuộc cơ sở cha theo parentId',
  })
  @IsUUID()
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({ description: 'Lọc theo trạng thái hoạt động' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;
}
