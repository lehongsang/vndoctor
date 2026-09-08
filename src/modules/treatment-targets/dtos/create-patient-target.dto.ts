import { PatientTargetStatus } from '@/commons/enums/vndoctor.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreatePatientTargetDto {
  @ApiProperty({ description: 'Health Profile ID', example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' })
  @IsUUID()
  healthProfileId: string;

  @ApiPropertyOptional({ description: 'Referenced Dictionary Code (e.g. A1, B2)', example: 'A1' })
  @IsString()
  @IsOptional()
  dictionaryCode?: string;

  @ApiPropertyOptional({ description: 'Examination ID if created from clinic visit' })
  @IsUUID()
  @IsOptional()
  examinationId?: string;

  @ApiPropertyOptional({ description: 'Assessment Result ID if created from risk screening' })
  @IsUUID()
  @IsOptional()
  assessmentResultId?: string;

  @ApiPropertyOptional({ description: 'Target Blood Pressure', example: '< 130/80 mmHg' })
  @IsString()
  @IsOptional()
  bpTarget?: string;

  @ApiPropertyOptional({ description: 'Target Lipid (LDL-C)', example: '< 1.8 mmol/L' })
  @IsString()
  @IsOptional()
  lipidTarget?: string;

  @ApiPropertyOptional({ description: 'Target BMI / Weight', example: 'BMI 20 - 22.9' })
  @IsString()
  @IsOptional()
  bmiTarget?: string;

  @ApiPropertyOptional({ description: 'Target Glycemic / HbA1c', example: 'HbA1c < 7.0%' })
  @IsString()
  @IsOptional()
  glycemicTarget?: string;

  @ApiPropertyOptional({ description: 'Diet Advice' })
  @IsString()
  @IsOptional()
  dietAdvice?: string;

  @ApiPropertyOptional({ description: 'Exercise Advice' })
  @IsString()
  @IsOptional()
  exerciseAdvice?: string;

  @ApiPropertyOptional({ description: 'Doctor Notes' })
  @IsString()
  @IsOptional()
  doctorNotes?: string;

  @ApiPropertyOptional({ enum: PatientTargetStatus, default: PatientTargetStatus.DRAFT })
  @IsEnum(PatientTargetStatus)
  @IsOptional()
  status?: PatientTargetStatus;
}
