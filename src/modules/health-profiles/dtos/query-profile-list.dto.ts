import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { GetManyBaseQueryParams } from '@/commons/dtos/get-many-base.dto';
import { CareSubscriptionStatus } from '@/commons/enums/vndoctor.enum';

export class QueryProfileListDto extends PartialType(GetManyBaseQueryParams) {
  @ApiPropertyOptional({
    description: 'ID Bác sĩ được chỉ định (Mặc định là Bác sĩ đang đăng nhập)',
    example: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  })
  @IsUUID('all')
  @IsOptional()
  doctorId?: string;

  @ApiPropertyOptional({
    description: 'ID cơ sở y tế (Chỉ định CSYT khi là Admin hệ thống)',
  })
  @IsUUID('all')
  @IsOptional()
  facilityId?: string;

  @ApiPropertyOptional({
    description: 'ID gói chăm sóc để lọc',
  })
  @IsUUID('all')
  @IsOptional()
  carePackageId?: string;

  @ApiPropertyOptional({
    enum: CareSubscriptionStatus,
    enumName: 'CareSubscriptionStatus',
    description: 'Trạng thái gói chăm sóc của bệnh nhân (Mặc định: ACTIVE)',
  })
  @IsEnum(CareSubscriptionStatus)
  @IsOptional()
  subscriptionStatus?: CareSubscriptionStatus;

  @ApiPropertyOptional({
    description: 'Từ khóa tìm kiếm theo tên bệnh nhân, SĐT, CCCD, mã gói chăm sóc',
  })
  @IsString()
  @IsOptional()
  search?: string;
}
