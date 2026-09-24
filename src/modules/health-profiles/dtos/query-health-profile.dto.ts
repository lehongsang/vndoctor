import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { GetManyBaseQueryParams } from '@/commons/dtos/get-many-base.dto';
import { FacilityPatientLinkStatus, ProfileRelationship } from '@/commons/enums/vndoctor.enum';

export class QueryHealthProfileDto extends PartialType(GetManyBaseQueryParams) {
  @ApiPropertyOptional({ description: 'ID cơ sở y tế (Chỉ định CSYT khi là Admin hệ thống)' })
  @IsUUID('all')
  @IsOptional()
  facilityId?: string;

  @ApiPropertyOptional({ description: 'ID tài khoản sở hữu' })
  @IsUUID('all')
  @IsOptional()
  accountId?: string;

  @ApiPropertyOptional({
    enum: ProfileRelationship,
    enumName: 'ProfileRelationship',
    description: 'Lọc theo mối quan hệ',
  })
  @IsEnum(ProfileRelationship)
  @IsOptional()
  relationship?: ProfileRelationship;

  @ApiPropertyOptional({
    enum: FacilityPatientLinkStatus,
    enumName: 'FacilityPatientLinkStatus',
    description: 'Lọc theo trạng thái liên kết với cơ sở y tế (Mặc định: ACTIVE)',
  })
  @IsEnum(FacilityPatientLinkStatus)
  @IsOptional()
  linkStatus?: FacilityPatientLinkStatus;

  @ApiPropertyOptional({ description: 'Tìm kiếm theo CCCD' })
  @IsString()
  @IsOptional()
  citizenId?: string;

  @ApiPropertyOptional({ description: 'Tìm kiếm theo SĐT' })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiPropertyOptional({
    description: 'Lọc theo ID nhân viên y tế / Bác sĩ / Điều dưỡng được phân công phụ trách gói',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsUUID('all')
  @IsOptional()
  staffId?: string;
}
