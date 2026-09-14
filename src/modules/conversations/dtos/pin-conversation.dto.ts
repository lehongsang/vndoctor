import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

/**
 * DTO for pinning or unpinning a medical conversation.
 */
export class PinConversationDto {
  @ApiProperty({
    description: 'Trạng thái ghim hội thoại (true = ghim, false = bỏ ghim)',
    example: true,
  })
  @IsNotEmpty({ message: 'isPinned không được để trống' })
  @IsBoolean({ message: 'isPinned phải là kiểu boolean' })
  isPinned: boolean;
}
