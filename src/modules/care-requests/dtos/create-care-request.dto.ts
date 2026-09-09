import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsOptional, IsString, IsUrl, IsUUID, MaxLength, MinLength } from 'class-validator';

/**
 * DTO for Patient creating a new Care Request.
 */
export class CreateCareRequestDto {
  @ApiProperty({
    description: 'ID gói đăng ký chăm sóc sức khỏe đang có hiệu lực (ACTIVE)',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsNotEmpty({ message: 'subscriptionId không được để trống' })
  @IsUUID('4', { message: 'subscriptionId phải là UUID v4 hợp lệ' })
  subscriptionId: string;

  @ApiProperty({
    description: 'Tiêu đề tóm tắt yêu cầu (5 - 255 ký tự)',
    example: 'Cảm thấy tức ngực sau khi uống thuốc huyết áp',
  })
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  @IsString({ message: 'Tiêu đề phải là chuỗi văn bản' })
  @MinLength(5, { message: 'Tiêu đề phải có ít nhất 5 ký tự' })
  @MaxLength(255, { message: 'Tiêu đề không vượt quá 255 ký tự' })
  title: string;

  @ApiPropertyOptional({
    description: 'Mô tả chi tiết triệu chứng, tiền sử hoặc câu hỏi',
    example: 'Tôi uống thuốc lúc 8h sáng, đến 10h thấy hồi hộp và choáng váng.',
  })
  @IsOptional()
  @IsString({ message: 'Mô tả phải là chuỗi văn bản' })
  description?: string;

  @ApiPropertyOptional({
    description: 'Danh sách URL hình ảnh đính kèm (ảnh đơn thuốc, vết thương, máy đo...)',
    type: [String],
    example: ['https://storage.vndoctor.vn/prescriptions/img-001.jpg'],
  })
  @IsOptional()
  @IsArray({ message: 'mediaUrls phải là một mảng' })
  @IsUrl({}, { each: true, message: 'Mỗi đường dẫn trong mediaUrls phải là URL hợp lệ' })
  mediaUrls?: string[];
}
