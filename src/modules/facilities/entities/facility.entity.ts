import { BaseEntity } from '@/commons/entities/base.entity';
import { FacilityType } from '@/commons/enums/vndoctor.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { StaffUser } from '@/modules/staff/entities/staff-user.entity';

/**
 * Entity representing a Medical Facility with hierarchical tree support.
 */
@Entity('facilities')
@Index('facilities_index_parent_id', ['parentId'])
export class Facility extends BaseEntity {
  @ApiProperty({ description: 'Unique facility code', example: 'HOSP-001' })
  @Column({ type: 'varchar', length: 50, unique: true })
  facilityCode: string;

  @ApiProperty({ description: 'Facility official name', example: 'Bệnh viện Đa khoa Quốc tế' })
  @Column({ type: 'varchar', length: 255 })
  facilityName: string;

  @ApiProperty({
    enum: FacilityType,
    enumName: 'FacilityType',
    description: 'Cấp cơ sở y tế (Tỉnh, Huyện, Xã, Phòng khám)',
    default: FacilityType.CLINIC,
  })
  @Column({
    type: 'enum',
    enum: FacilityType,
    default: FacilityType.CLINIC,
  })
  facilityType: FacilityType;

  @ApiPropertyOptional({
    description: 'ID cơ sở y tế cấp trên trực tiếp (Parent Facility ID)',
    example: 'd3b07384-d113-46fb-a709-a1b74a6fc6d0',
  })
  @Column({ type: 'uuid', nullable: true })
  parentId?: string | null;

  @ManyToOne(() => Facility, (facility) => facility.children, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'parentId' })
  parent?: Facility | null;

  @OneToMany(() => Facility, (facility) => facility.parent)
  children: Facility[];

  @ApiPropertyOptional({ description: 'Contact phone number', example: '02839998888' })
  @Column({ type: 'varchar', length: 20, nullable: true })
  phoneNumber?: string | null;

  @ApiProperty({ description: 'Facility physical address', example: '123 Nguyễn Trãi, Quận 5, TP.HCM' })
  @Column({ type: 'text' })
  address: string;

  @ApiProperty({ description: 'Active status', default: true })
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => StaffUser, (staff) => staff.facility)
  staffUsers: StaffUser[];
}
