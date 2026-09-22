import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO chuẩn hóa dữ liệu trả về cho bệnh mạn tính.
 */
export class ChronicDiseaseResponseDto {
  @ApiProperty({
    description: 'Mã định danh bệnh mạn tính (UUID)',
    example: '01a08454-a217-70cc-9ff2-c03053354a10',
  })
  id: string;

  @ApiProperty({
    description: 'Mã code chuẩn bệnh (ví dụ: SCORE2_HYPERTENSION, DIABETES)',
    example: 'SCORE2_HYPERTENSION',
  })
  code: string;

  @ApiProperty({
    description: 'Tên bệnh mạn tính',
    example: 'Tăng huyết áp',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Mã phân loại quốc tế ICD-10',
    example: 'I10',
    nullable: true,
  })
  icd10Code?: string | null;
}
