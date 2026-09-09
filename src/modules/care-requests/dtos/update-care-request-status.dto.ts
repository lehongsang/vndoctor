import { CareRequestStatus } from '@/commons/enums/vndoctor.enum';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

/**
 * DTO for updating the operational status of a Care Request.
 */
export class UpdateCareRequestStatusDto {
  @ApiProperty({
    enum: CareRequestStatus,
    enumName: 'CareRequestStatus',
    description: 'Trạng thái mới cần chuyển: IN_PROGRESS hoặc CANCELLED',
    example: CareRequestStatus.IN_PROGRESS,
  })
  @IsNotEmpty({ message: 'Trạng thái không được để trống' })
  @IsEnum(CareRequestStatus, {
    message: 'Trạng thái phải là một trong: PENDING, IN_PROGRESS, RESOLVED, CANCELLED',
  })
  status: CareRequestStatus;
}
