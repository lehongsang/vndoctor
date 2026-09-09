import { BaseEntity } from '@/commons/entities/base.entity';
import { ConversationStatus, ConversationType } from '@/commons/enums/vndoctor.enum';
import { Facility } from '@/modules/facilities/entities/facility.entity';
import { HealthProfile } from '@/modules/health-profiles/entities/health-profile.entity';
import { PatientCareSubscription } from './care-subscription.entity';
import { StaffUser } from '@/modules/staff/entities/staff-user.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne, Relation } from 'typeorm';

/**
 * Entity representing a Medical Chat Conversation (Care Team Group or Direct Doctor-Patient chat).
 */
@Entity('conversations')
@Index('conversations_index_facility_id', ['facilityId'])
@Index('conversations_index_subscription_id', ['subscriptionId'])
@Index('conversations_index_health_profile_id', ['healthProfileId'])
export class Conversation extends BaseEntity {
  @ApiProperty({ description: 'Facility ID to which the conversation belongs' })
  @Column({ type: 'uuid', name: 'facility_id' })
  facilityId: string;

  @ManyToOne(() => Facility, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'facility_id' })
  facility?: Relation<Facility>;

  @ApiProperty({
    enum: ConversationType,
    enumName: 'ConversationType',
    description: 'Loại hội thoại: CARE_TEAM (Nhóm chăm sóc y tế) hoặc DIRECT (1-1)',
    default: ConversationType.CARE_TEAM,
  })
  @Column({
    type: 'enum',
    enum: ConversationType,
    default: ConversationType.CARE_TEAM,
  })
  type: ConversationType;

  @ApiPropertyOptional({
    description: 'Tên tiêu đề phòng chat',
    example: 'Nhóm Chăm Sóc - BN Trần Thị Mai',
  })
  @Column({ type: 'varchar', length: 255, nullable: true })
  title?: string | null;

  @ApiProperty({
    enum: ConversationStatus,
    enumName: 'ConversationStatus',
    description: 'Trạng thái hoạt động phòng chat',
    default: ConversationStatus.ACTIVE,
  })
  @Column({
    type: 'enum',
    enum: ConversationStatus,
    default: ConversationStatus.ACTIVE,
  })
  status: ConversationStatus;

  @ApiPropertyOptional({
    description: 'ID gói đăng ký chăm sóc liên kết (nếu type = CARE_TEAM)',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @Column({ type: 'uuid', nullable: true, name: 'subscription_id' })
  subscriptionId?: string | null;

  @ManyToOne(() => PatientCareSubscription, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subscription_id' })
  subscription?: Relation<PatientCareSubscription> | null;

  @ApiPropertyOptional({
    description: 'ID hồ sơ bệnh nhân trong phòng chat',
    example: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  })
  @Column({ type: 'uuid', nullable: true, name: 'health_profile_id' })
  healthProfileId?: string | null;

  @ManyToOne(() => HealthProfile, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'health_profile_id' })
  healthProfile?: Relation<HealthProfile> | null;

  @ApiPropertyOptional({
    description: 'ID nhân viên y tế nếu là chat trực tiếp 1-1',
    example: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  })
  @Column({ type: 'uuid', nullable: true, name: 'direct_user_id' })
  directUserId?: string | null;

  @ManyToOne(() => StaffUser, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'direct_user_id' })
  directUser?: Relation<StaffUser> | null;

  @ApiPropertyOptional({ description: 'ID tin nhắn mới nhất trong hội thoại' })
  @Column({ type: 'uuid', nullable: true, name: 'last_message_id' })
  lastMessageId?: string | null;

  @ApiPropertyOptional({ description: 'Thời điểm gửi tin nhắn cuối cùng' })
  @Column({ type: 'timestamptz', nullable: true, name: 'last_message_at' })
  lastMessageAt?: Date | null;

  @ApiPropertyOptional({ description: 'Đoạn trích dẫn tin nhắn mới nhất' })
  @Column({ type: 'varchar', length: 255, nullable: true, name: 'last_message_preview' })
  lastMessagePreview?: string | null;
}
