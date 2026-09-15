import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { OcrEngineType } from '../interfaces/ocr.interface';

/**
 * DTO chứa các tùy chọn khi gửi yêu cầu OCR tệp tin PDF/Ảnh bệnh án.
 */
export class OcrPdfDto {
  @ApiPropertyOptional({
    description: 'Bắt buộc chạy OCR ngay cả khi PDF đã chứa text kỹ thuật số sẵn',
    default: false,
    example: false,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }): boolean => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return Boolean(value);
  })
  @IsBoolean()
  force_ocr?: boolean = false;

  @ApiPropertyOptional({
    description: 'Độ phân giải render ảnh từ trang PDF (DPI)',
    default: 150,
    example: 150,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }): number =>
    value !== undefined && value !== null && value !== '' ? Number(value) : 150,
  )
  @IsInt()
  @Min(72)
  @Max(600)
  dpi?: number = 150;

  @ApiPropertyOptional({
    description: 'Ngôn ngữ OCR cần nhận diện',
    default: 'vie+eng',
    example: 'vie+eng',
  })
  @IsOptional()
  @IsString()
  lang?: string = 'vie+eng';

  @ApiPropertyOptional({
    description: 'Engine OCR sử dụng (rapidocr | tesseract)',
    enum: ['rapidocr', 'tesseract'],
    default: 'rapidocr',
    example: 'rapidocr',
  })
  @IsOptional()
  @IsEnum(['rapidocr', 'tesseract'], {
    message: 'engine phải là rapidocr hoặc tesseract',
  })
  engine?: OcrEngineType = 'rapidocr';
}
