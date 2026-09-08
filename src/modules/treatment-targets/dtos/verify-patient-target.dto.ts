import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

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

  @ApiPropertyOptional({ description: 'Diet Advice adjusted by doctor' })
  @IsString()
  @IsOptional()
  dietAdvice?: string;

  @ApiPropertyOptional({ description: 'Exercise Advice adjusted by doctor' })
  @IsString()
  @IsOptional()
  exerciseAdvice?: string;

  @ApiPropertyOptional({ description: 'Doctor clinical notes & verification remarks' })
  @IsString()
  @IsOptional()
  doctorNotes?: string;
}
