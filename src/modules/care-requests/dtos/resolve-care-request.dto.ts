import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

/**
 * DTO for Doctor/Nurse resolving a Care Request with clinical conclusions and instructions.
 */
export class ResolveCareRequestDto {
  @ApiProperty({
    description: 'Nội dung phản hồi / kết luận xử lý y khoa của Bác sĩ/Điều dưỡng',
    example: 'Bệnh nhân tạm ngưng liều thuốc buổi trưa, uống nhiều nước ấm và đo lại huyết áp sau 1 giờ.',
  })
  @IsNotEmpty({ message: 'Nội dung kết luận xử lý (resolutionNote) không được để trống' })
  @IsString({ message: 'resolutionNote phải là chuỗi văn bản' })
  @MinLength(5, { message: 'Nội dung kết luận phải có ít nhất 5 ký tự' })
  resolutionNote: string;
}
