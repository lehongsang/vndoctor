import { BaseEntity } from '@/commons/entities/base.entity';
import { HealthMetricType } from '@/commons/enums/vndoctor.enum';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { HealthProfile } from '@/modules/health-profiles/entities/health-profile.entity';

/**
 * Entity representing personal health metric measurements recorded over time.
 */
@Entity('health_records')
@Index('health_records_index_21', ['healthProfileId', 'metricType', 'measuredAt'])
@Index('health_records_index_22', ['measuredAt'])
export class HealthRecord extends BaseEntity {
  @ApiProperty({ description: 'Health Profile ID' })
  @Column({ type: 'uuid' })
  healthProfileId: string;

  @ManyToOne(() => HealthProfile, (profile) => profile.healthRecords, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'healthProfileId' })
  healthProfile: HealthProfile;

  @ApiProperty({ enum: HealthMetricType, enumName: 'HealthMetricType' })
  @Column({ type: 'enum', enum: HealthMetricType })
  metricType: HealthMetricType;

  @ApiProperty({ description: 'Primary measurement value (e.g. Systolic BP, Glucose, Weight)', example: 125.0 })
  @Column({ type: 'decimal', precision: 8, scale: 2 })
  valueNumeric: number;

  @ApiPropertyOptional({ description: 'Secondary measurement value (e.g. Diastolic BP for Blood Pressure)', example: 82.0 })
  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  secondaryValue?: number | null;

  @ApiProperty({ description: 'Measurement unit', example: 'mmHg' })
  @Column({ type: 'varchar', length: 20 })
  unit: string;

  @ApiPropertyOptional({ description: 'Patient note or measurement context (e.g. Đo lúc vừa ngủ dậy)', example: 'Đo buổi sáng lúc đói' })
  @Column({ type: 'text', nullable: true })
  note?: string | null;

  @ApiProperty({ description: 'Timestamp when measurement was taken' })
  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  measuredAt: Date;
}
