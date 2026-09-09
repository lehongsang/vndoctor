import { BaseEntity } from '@/commons/entities/base.entity';
import { MessageType, SenderType } from '@/commons/enums/vndoctor.enum';
import { Conversation } from './conversation.entity';
import { StaffUser } from '@/modules/staff/entities/staff-user.entity';
import { Account } from '@/modules/accounts/entities/account.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne, Relation } from 'typeorm';

/**
 * Entity representing a Message in a Medical Conversation.
 */
@Entity('messages')
@Index('messages_index_conversation_id', ['conversationId'])
@Index('messages_index_sender_user_id', ['senderUserId'])
@Index('messages_index_sender_account_id', ['senderAccountId'])
@Index('messages_index_created_at', ['createdAt'])
export class Message extends BaseEntity {
  @ApiProperty({ description: 'Conversation ID' })
  @Column({ type: 'uuid', name: 'conversation_id' })
  conversationId: string;

  @ManyToOne(() => Conversation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation?: Relation<Conversation>;

  @ApiProperty({
    enum: SenderType,
    enumName: 'SenderType',
    description: 'Người gửi tin nhắn: STAFF / PATIENT / SYSTEM',
  })
  @Column({
    type: 'enum',
    enum: SenderType,
    name: 'sender_type',
  })
  senderType: SenderType;

  @ApiPropertyOptional({
    description: 'ID nhân viên y tế nếu người gửi là STAFF',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @Column({ type: 'uuid', nullable: true, name: 'sender_user_id' })
  senderUserId?: string | null;

  @ManyToOne(() => StaffUser, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sender_user_id' })
  senderUser?: Relation<StaffUser> | null;

  @ApiPropertyOptional({
    description: 'ID tài khoản bệnh nhân nếu người gửi là PATIENT',
    example: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  })
  @Column({ type: 'uuid', nullable: true, name: 'sender_account_id' })
  senderAccountId?: string | null;

  @ManyToOne(() => Account, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'sender_account_id' })
  senderAccount?: Relation<Account> | null;

  @ApiProperty({
    enum: MessageType,
    enumName: 'MessageType',
    description: 'Loại tin nhắn (TEXT, IMAGE, FILE, SYSTEM, EXAMINATION,...)',
    default: MessageType.TEXT,
  })
  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.TEXT,
    name: 'message_type',
  })
  messageType: MessageType;

  @ApiProperty({
    description: 'Nội dung tin nhắn văn bản / Lời chào hệ thống',
    example: 'Chào mừng bạn đến với nhóm chăm sóc y tế.',
  })
  @Column({ type: 'text' })
  content: string;

  @ApiPropertyOptional({
    description: 'ID thực thể đính kèm (phiếu khám, kết quả đo, chỉ định...)',
  })
  @Column({ type: 'uuid', nullable: true, name: 'resource_id' })
  resourceId?: string | null;

  @ApiPropertyOptional({
    description: 'URL file hoặc hình ảnh đính kèm',
  })
  @Column({ type: 'text', nullable: true, name: 'media_url' })
  mediaUrl?: string | null;

  @ApiPropertyOptional({
    description: 'ID tin nhắn được trả lời',
  })
  @Column({ type: 'uuid', nullable: true, name: 'reply_to_message_id' })
  replyToMessageId?: string | null;

  @ApiProperty({
    description: 'Tin nhắn đã được ghim hay chưa',
    default: false,
  })
  @Column({ type: 'boolean', default: false, name: 'is_pinned' })
  isPinned: boolean;

  @ApiProperty({
    description: 'Đánh dấu tin nhắn đã bị thu hồi / xóa',
    default: false,
  })
  @Column({ type: 'boolean', default: false, name: 'is_deleted' })
  isDeleted: boolean;
}
