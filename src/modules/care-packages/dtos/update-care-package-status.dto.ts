import { CarePackageStatus } from '@/commons/enums/vndoctor.enum';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

/**
 * DTO for updating Care Package operational status
 */
export class UpdateCarePackageStatusDto {
  @ApiProperty({
    enum: CarePackageStatus,
    enumName: 'CarePackageStatus',
    description: 'Updated operational status',
    example: CarePackageStatus.ACTIVE,
  })
  @IsNotEmpty({ message: 'Status is required' })
  @IsEnum(CarePackageStatus, { message: 'Status must be ACTIVE or INACTIVE' })
  status: CarePackageStatus;
}
