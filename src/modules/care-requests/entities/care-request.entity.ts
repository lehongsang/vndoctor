import { BaseEntity } from '@/commons/entities/base.entity';
import { CareRequestStatus } from '@/commons/enums/vndoctor.enum';
import { PatientCareSubscription } from '@/modules/care-subscriptions/entities/care-subscription.entity';
import { Facility } from '@/modules/facilities/entities/facility.entity';
import { StaffUser } from '@/modules/staff/entities/staff-user.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne, Relation } from 'typeorm';

/**
 * Entity representing a Patient Care Request (Yêu cầu hỗ trợ chăm sóc y tế từ bệnh nhân).
 */
@Entity('patient_care_requests')
@Index('care_requests_index_facility_id', ['facilityId'])
@Index('care_requests_index_subscription_id', ['subscriptionId'])
@Index('care_requests_index_assigned_user_id', ['assignedUserId'])
@Index('care_requests_index_status', ['status'])
@Index('care_requests_index_request_code', ['requestCode'])
export class PatientCareRequest extends BaseEntity {
  @ApiProperty({
    description: 'Unique request code (Mã yêu cầu y tế)',
    example: 'REQ-20260908-AB12',
  })
  @Column({ type: 'varchar', length: 50, unique: true, name: 'request_code' })
  requestCode: string;

  @ApiProperty({
    description: 'Facility ID processing this request',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @Column({ type: 'uuid', name: 'facility_id' })
  facilityId: string;

  @ManyToOne(() => Facility, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'facility_id' })
  facility?: Relation<Facility>;

  @ApiProperty({
    description: 'ID of the active care subscription',
    example: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  })
  @Column({ type: 'uuid', name: 'subscription_id' })
  subscriptionId: string;

  @ManyToOne(() => PatientCareSubscription, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subscription_id' })
  subscription?: Relation<PatientCareSubscription>;

  @ApiPropertyOptional({
    description: 'ID of the assigned healthcare staff handling this request (users.id)',
    example: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33',
  })
  @Column({ type: 'uuid', nullable: true, name: 'assigned_user_id' })
  assignedUserId?: string | null;

  @ManyToOne(() => StaffUser, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_user_id' })
  assignedUser?: Relation<StaffUser> | null;

  @ApiProperty({
    enum: CareRequestStatus,
    enumName: 'CareRequestStatus',
    description: 'Trạng thái xử lý yêu cầu: PENDING, IN_PROGRESS, RESOLVED, CANCELLED',
    default: CareRequestStatus.PENDING,
  })
  @Column({
    type: 'enum',
    enum: CareRequestStatus,
    default: CareRequestStatus.PENDING,
  })
  status: CareRequestStatus;

  @ApiProperty({
    description: 'Tiêu đề tóm tắt yêu cầu của bệnh nhân',
    example: 'Cảm thấy tức ngực và chóng mặt sau khi uống thuốc huyết áp',
  })
  @Column({ type: 'varchar', length: 255 })
  title: string;

  @ApiPropertyOptional({
    description: 'Mô tả chi tiết triệu chứng hoặc câu hỏi y khoa',
    example: 'Uống thuốc lúc 8h sáng, đến 10h bắt đầu thấy hoa mắt và hồi hộp.',
  })
  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @ApiPropertyOptional({
    description: 'Danh sách URL hình ảnh đính kèm (ảnh đơn thuốc, vết thương, chỉ số đo...)',
    type: [String],
    example: ['https://storage.vndoctor.vn/prescriptions/img-001.jpg'],
  })
  @Column({ type: 'text', array: true, default: '{}', name: 'media_urls' })
  mediaUrls: string[];

  @ApiPropertyOptional({
    description: 'Nội dung phản hồi / kết luận xử lý chuyên môn của Bác sĩ/Điều dưỡng',
    example: 'Bệnh nhân tạm ngừng liều thuốc buổi trưa, đo lại huyết áp sau 30 phút và liên hệ lại nếu HA > 160.',
  })
  @Column({ type: 'text', nullable: true, name: 'resolution_note' })
  resolutionNote?: string | null;

  @ApiPropertyOptional({
    description: 'Thời điểm hoàn tất xử lý yêu cầu',
    example: '2026-09-08T10:30:00Z',
  })
  @Column({ type: 'timestamptz', nullable: true, name: 'resolved_at' })
  resolvedAt?: Date | null;
}
