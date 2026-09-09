import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

/**
 * DTO for pinning or unpinning a message.
 */
export class PinMessageDto {
  @ApiProperty({
    description: 'Trạng thái ghim: true = Ghim, false = Bỏ ghim',
    example: true,
  })
  @IsNotEmpty({ message: 'isPinned không được để trống' })
  @IsBoolean({ message: 'isPinned phải là kiểu boolean' })
  isPinned: boolean;
}
