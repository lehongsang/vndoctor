import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';
import { GetManyBaseQueryParams } from '@/commons/dtos/get-many-base.dto';
import { FacilityType } from '@/commons/enums/vndoctor.enum';

export class QueryFacilityDto extends PartialType(GetManyBaseQueryParams) {
  @ApiPropertyOptional({
    enum: FacilityType,
    enumName: 'FacilityType',
    description: 'Lọc theo cấp cơ sở y tế (CENTRAL_HOSPITAL, PROVINCIAL_HOSPITAL, DISTRICT_HOSPITAL, COMMUNE_HEALTH_STATION, CLINIC)',
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

  @ApiPropertyOptional({
    description: 'Chỉ lấy các cơ sở y tế cấp cao nhất (Tuyến trung ương/đầu ngành không có cơ sở cha parentId)',
  })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isRoot?: boolean;

  @ApiPropertyOptional({ description: 'Lọc theo trạng thái hoạt động' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;
}

export class QueryChildrenFacilityDto extends PartialType(GetManyBaseQueryParams) {
  @ApiPropertyOptional({
    enum: FacilityType,
    enumName: 'FacilityType',
    description: 'Lọc theo phân loại cấp cơ sở y tế con',
  })
  @IsEnum(FacilityType)
  @IsOptional()
  facilityType?: FacilityType;

  @ApiPropertyOptional({ description: 'Lọc theo trạng thái hoạt động của cơ sở con' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;
}
