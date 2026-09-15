import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/**
 * DTO tùy chọn cho OCR căn cước công dân.
 */
export class OcrCccdDto {
  @ApiPropertyOptional({
    description: 'Ghi chú hoặc ngữ cảnh phân tích CCCD',
    example: 'Xác thực hồ sơ bệnh nhân',
  })
  @IsOptional()
  @IsString()
  note?: string;
}
