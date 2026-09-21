import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UpdatePatientTargetDto {
  @ApiPropertyOptional({ description: 'Target Blood Pressure', example: '< 130/80 mmHg' })
  @IsString()
  @IsOptional()
  bpTarget?: string;

  @ApiPropertyOptional({ description: 'Target Lipid (LDL-C)', example: '< 1.8 mmol/L' })
  @IsString()
  @IsOptional()
  lipidTarget?: string;

  @ApiPropertyOptional({ description: 'Target BMI / Weight', example: 'BMI 20 - 22.9 kg/m2' })
  @IsString()
  @IsOptional()
  bmiTarget?: string;

  @ApiPropertyOptional({ description: 'Target Glycemic / HbA1c', example: 'HbA1c < 7.0%' })
  @IsString()
  @IsOptional()
  glycemicTarget?: string;

  @ApiPropertyOptional({ description: 'Target Renal / Kidney guidance' })
  @IsString()
  @IsOptional()
  renalTarget?: string;

  @ApiPropertyOptional({ description: 'Dietary guidance' })
  @IsString()
  @IsOptional()
  dietAdvice?: string;

  @ApiPropertyOptional({ description: 'Exercise guidance' })
  @IsString()
  @IsOptional()
  exerciseAdvice?: string;

  @ApiPropertyOptional({ description: 'Smoking cessation advice' })
  @IsString()
  @IsOptional()
  smokingAdvice?: string;

  @ApiPropertyOptional({ description: 'Primary Doctor clinical notes' })
  @IsString()
  @IsOptional()
  doctorNotes?: string;

  @ApiPropertyOptional({ description: 'Specialist / Expert Doctor consultation notes' })
  @IsString()
  @IsOptional()
  expertNotes?: string;
}
