import { VnDoctorPlanStatus } from '@/commons/enums/vndoctor.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateTreatmentPlanDto {
  @ApiProperty({ description: 'Health Profile ID of patient', example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @IsUUID()
  healthProfileId: string;

  @ApiPropertyOptional({ description: 'Associated treatment target ID' })
  @IsUUID()
  @IsOptional()
  treatmentTargetId?: string;

  @ApiProperty({ description: 'Title of treatment plan', example: 'Phác đồ điều trị Tăng huyết áp 3 tháng' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ description: 'Start Date (YYYY-MM-DD)', example: '2026-09-08' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End Date (YYYY-MM-DD)', example: '2026-12-08' })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Doctor Clinical Notes & Instructions' })
  @IsString()
  @IsOptional()
  doctorNotes?: string;

  @ApiPropertyOptional({ enum: VnDoctorPlanStatus, default: VnDoctorPlanStatus.ACTIVE })
  @IsEnum(VnDoctorPlanStatus)
  @IsOptional()
  status?: VnDoctorPlanStatus;
}
