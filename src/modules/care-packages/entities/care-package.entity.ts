import { BaseEntity } from '@/commons/entities/base.entity';
import { CarePackageStatus, CarePackageType } from '@/commons/enums/vndoctor.enum';
import { Facility } from '@/modules/facilities/entities/facility.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';

/**
 * Entity representing a Medical Care Package provided by a Healthcare Facility.
 */
@Entity('care_packages')
@Index('care_packages_index_facility_id', ['facilityId'])
@Index('care_packages_index_status', ['status'])
@Index('care_packages_index_code', ['code'])
export class CarePackage extends BaseEntity {
  @ApiProperty({
    description: 'Facility ID offering this care package',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @Column({ type: 'uuid' })
  facilityId: string;

  @ManyToOne(() => Facility, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'facility_id' })
  facility?: Facility;

  @ApiProperty({
    description: 'Unique package code',
    example: 'PKG-CARDIO-30D',
  })
  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @ApiProperty({
    description: 'Care package name',
    example: 'Gói Chăm Sóc Sức Khỏe Tim Mạch 30 Ngày',
  })
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @ApiProperty({
    enum: CarePackageType,
    enumName: 'CarePackageType',
    description: 'Phân loại gói chăm sóc (STANDARD / VIP)',
    default: CarePackageType.STANDARD,
  })
  @Column({
    type: 'enum',
    enum: CarePackageType,
    default: CarePackageType.STANDARD,
  })
  type: CarePackageType;

  @ApiPropertyOptional({
    description: 'Detailed description of package benefits and rights',
    example: 'Bao gồm theo dõi huyết áp hàng ngày, tư vấn bởi bác sĩ chuyên khoa và điều dưỡng.',
  })
  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @ApiProperty({
    description: 'Duration of care package in days',
    example: 30,
  })
  @Column({ type: 'int', name: 'duration_days' })
  durationDays: number;

  @ApiProperty({
    description: 'Package price amount in VND',
    example: 1500000,
  })
  @Column({
    type: 'decimal',
    precision: 14,
    scale: 2,
    default: 0,
    name: 'price_amount',
  })
  priceAmount: number;

  @ApiProperty({
    enum: CarePackageStatus,
    enumName: 'CarePackageStatus',
    description: 'Trạng thái kích hoạt của gói (ACTIVE / INACTIVE)',
    default: CarePackageStatus.ACTIVE,
  })
  @Column({
    type: 'enum',
    enum: CarePackageStatus,
    default: CarePackageStatus.ACTIVE,
  })
  status: CarePackageStatus;
}
