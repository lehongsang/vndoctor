import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateChronicDiseaseDto {
  @ApiProperty({ description: 'Mã định danh bệnh (Duy nhất)', example: 'HYPERTENSION' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code: string;

  @ApiProperty({ description: 'Tên bệnh mạn tính', example: 'Tăng huyết áp vô căn (nguyên phát)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Mã ICD-10 chuẩn', example: 'I10' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  icd10Code?: string;

  @ApiPropertyOptional({ description: 'Nhóm bệnh (Tim mạch, Chuyển hóa, Hô hấp...)', example: 'Tim mạch' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({ description: 'Trạng thái hoạt động', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Thứ tự hiển thị', default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  displayOrder?: number;
}
