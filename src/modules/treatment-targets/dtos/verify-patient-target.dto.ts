import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';

export class VerifyPatientTargetDto {
  @ApiPropertyOptional({ description: 'Target Blood Pressure adjusted by doctor', example: '< 130/80 mmHg' })
  @IsString()
  @IsOptional()
  bpTarget?: string;

  @ApiPropertyOptional({ description: 'Target Lipid adjusted by doctor', example: '< 1.8 mmol/L' })
  @IsString()
  @IsOptional()
  lipidTarget?: string;

  @ApiPropertyOptional({ description: 'Target BMI adjusted by doctor', example: 'BMI 20 - 22.9' })
  @IsString()
  @IsOptional()
  bmiTarget?: string;

  @ApiPropertyOptional({ description: 'Target Glycemic adjusted by doctor', example: 'HbA1c < 7.0%' })
  @IsString()
  @IsOptional()
  glycemicTarget?: string;

  @ApiPropertyOptional({ description: 'Target Renal / Kidney guidance adjusted by doctor' })
  @IsString()
  @IsOptional()
  renalTarget?: string;

  @ApiPropertyOptional({ description: 'Diet Advice adjusted by doctor' })
  @IsString()
  @IsOptional()
  dietAdvice?: string;

  @ApiPropertyOptional({ description: 'Exercise Advice adjusted by doctor' })
  @IsString()
  @IsOptional()
  exerciseAdvice?: string;

  @ApiPropertyOptional({ description: 'Smoking cessation advice adjusted by doctor' })
  @IsString()
  @IsOptional()
  smokingAdvice?: string;

  @ApiPropertyOptional({
    description: 'Các mục tiêu điều trị tùy chỉnh / mở rộng bổ sung do bác sĩ xác nhận (dạng key-value hoặc dynamic JSON)',
    example: { uricAcid: '< 360 umol/L', restingHeartRate: '60 - 75 bpm' },
  })
  @IsObject()
  @IsOptional()
  customTargets?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Doctor clinical notes & verification remarks' })
  @IsString()
  @IsOptional()
  doctorNotes?: string;

  @ApiPropertyOptional({ description: 'Expert Doctor consultation notes & remarks' })
  @IsString()
  @IsOptional()
  expertNotes?: string;
}
