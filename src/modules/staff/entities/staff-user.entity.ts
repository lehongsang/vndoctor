import { BaseEntity } from '@/commons/entities/base.entity';
import { StaffRole } from '@/commons/enums/vndoctor.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { Facility } from '@/modules/facilities/entities/facility.entity';

/**
 * Entity representing Medical Staff (Admin, Doctor, Nurse, Tech, Staff) in CMS.
 */
@Entity('users')
export class StaffUser extends BaseEntity {
  @ApiPropertyOptional({ description: 'Facility ID to which the staff belongs (null for Root System Admin)' })
  @Index('users_index_0')
  @Column({ type: 'uuid', nullable: true })
  facilityId?: string | null;

  @ManyToOne(() => Facility, (facility) => facility.staffUsers, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'facilityId' })
  facility?: Facility | null;

  @ApiProperty({ description: 'Staff code or medical practice certificate number', example: 'CCHN-12345' })
  @Column({ type: 'varchar', length: 50, unique: true })
  staffCode: string;

  @ApiProperty({ description: 'Login username', example: 'dr_nguyenvanan' })
  @Column({ type: 'varchar', length: 50, unique: true })
  username: string;

  @Column({ type: 'varchar', length: 255, select: false })
  passwordHash: string;

  @ApiProperty({ description: 'Full legal name', example: 'BS. CKII Nguyễn Văn An' })
  @Column({ type: 'varchar', length: 255 })
  fullName: string;

  @ApiProperty({ enum: StaffRole, enumName: 'StaffRole', default: StaffRole.STAFF })
  @Index('users_index_1')
  @Column({ type: 'enum', enum: StaffRole, default: StaffRole.STAFF })
  role: StaffRole;

  @ApiPropertyOptional({ description: 'Medical specialty', example: 'Tim mạch can thiệp' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  specialty?: string | null;

  @ApiPropertyOptional({ description: 'Contact email', example: 'dr.an@hospital.vn' })
  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  email?: string | null;

  @ApiPropertyOptional({ description: 'Contact phone number', example: '0912345678' })
  @Column({ type: 'varchar', length: 20, nullable: true })
  phoneNumber?: string | null;

  @ApiProperty({ description: 'Is active staff account', default: true })
  @Index('users_index_2')
  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
