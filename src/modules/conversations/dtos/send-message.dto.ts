import { MessageType } from '@/commons/enums/vndoctor.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUrl, IsUUID } from 'class-validator';

/**
 * DTO for sending a message in a conversation.
 */
export class SendMessageDto {
  @ApiProperty({
    description: 'Nội dung tin nhắn văn bản',
    example: 'Chào bác sĩ, hôm nay chỉ số huyết áp của tôi là 125/80 mmHg.',
  })
  @IsNotEmpty({ message: 'Nội dung tin nhắn không được để trống' })
  @IsString({ message: 'Nội dung tin nhắn phải là chuỗi văn bản' })
  content: string;

  @ApiPropertyOptional({
    enum: MessageType,
    enumName: 'MessageType',
    description: 'Phân loại tin nhắn (TEXT, IMAGE, FILE, EXAMINATION, RISK_ASSESSMENT, HEALTH_RECORD, CARE_REQUEST...)',
    default: MessageType.TEXT,
  })
  @IsOptional()
  @IsEnum(MessageType, { message: 'Loại tin nhắn không hợp lệ' })
  messageType?: MessageType = MessageType.TEXT;

  @ApiPropertyOptional({
    description: 'ID thực thể y tế liên kết (phiếu khám, chỉ số đo, yêu cầu chăm sóc...)',
    example: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  })
  @IsOptional()
  @IsUUID('4', { message: 'resourceId phải là UUID hợp lệ' })
  resourceId?: string;

  @ApiPropertyOptional({
    description: 'URL file hoặc hình ảnh đính kèm',
    example: 'https://storage.vndoctor.vn/chat/image-01.jpg',
  })
  @IsOptional()
  @IsUrl({}, { message: 'mediaUrl phải là một URL hợp lệ' })
  mediaUrl?: string;

  @ApiPropertyOptional({
    description: 'ID tin nhắn được trả lời',
    example: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a44',
  })
  @IsOptional()
  @IsUUID('4', { message: 'replyToMessageId phải là UUID hợp lệ' })
  replyToMessageId?: string;
}
