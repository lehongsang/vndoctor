import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';
import { StaffRole } from '@/commons/enums/vndoctor.enum';
import { GetManyBaseQueryParams } from '@/commons/dtos/get-many-base.dto';

export class QueryStaffDto extends PartialType(GetManyBaseQueryParams) {
  @ApiPropertyOptional({ description: 'ID cơ sở y tế cần lọc' })
  @IsUUID()
  @IsOptional()
  facilityId?: string;

  @ApiPropertyOptional({ enum: StaffRole, enumName: 'StaffRole', description: 'Lọc theo vai trò' })
  @IsEnum(StaffRole)
  @IsOptional()
  role?: StaffRole;

  @ApiPropertyOptional({ description: 'Lọc theo trạng thái hoạt động' })
  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  isActive?: boolean;
}
