import { GetManyBaseQueryParams } from '@/commons/dtos/get-many-base.dto';
import { CarePackageStatus, CarePackageType } from '@/commons/enums/vndoctor.enum';
import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

/**
 * Query DTO for filtering Care Packages
 */
export class QueryCarePackageDto extends PartialType(GetManyBaseQueryParams) {
  @ApiPropertyOptional({
    description: 'Filter by Facility ID',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsUUID('4', { message: 'facilityId must be a valid UUID' })
  @IsOptional()
  facilityId?: string;

  @ApiPropertyOptional({
    enum: CarePackageType,
    enumName: 'CarePackageType',
    description: 'Filter by Package Type (STANDARD / VIP)',
  })
  @IsEnum(CarePackageType, { message: 'Type must be STANDARD or VIP' })
  @IsOptional()
  type?: CarePackageType;

  @ApiPropertyOptional({
    enum: CarePackageStatus,
    enumName: 'CarePackageStatus',
    description: 'Filter by Package Status (ACTIVE / INACTIVE)',
  })
  @IsEnum(CarePackageStatus, { message: 'Status must be ACTIVE or INACTIVE' })
  @IsOptional()
  status?: CarePackageStatus;

  @ApiPropertyOptional({
    description: 'Search by package name or code keyword',
    example: 'Tim mạch',
  })
  @IsString()
  @IsOptional()
  search?: string;
}
