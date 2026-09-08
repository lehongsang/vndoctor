import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateTreatmentTemplateDto {
  @ApiPropertyOptional({ description: 'Facility ID (Defaults to logged-in doctor/staff facility)' })
  @IsUUID()
  @IsOptional()
  facilityId?: string;

  @ApiProperty({ description: 'Template Name', example: 'Phác đồ kiểm soát THA Độ 1' })
  @IsString()
  @IsNotEmpty()
  templateName: string;

  @ApiPropertyOptional({ description: 'Disease Category', example: 'Tim mạch' })
  @IsString()
  @IsOptional()
  diseaseCategory?: string;

  @ApiProperty({ description: 'Protocol Content (Markdown or JSON)', example: '# Hướng dẫn điều trị THA...' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ description: 'Active Status', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
