import { BaseEntity } from '@/commons/entities/base.entity';
import { Facility } from '@/modules/facilities/entities/facility.entity';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';

/**
 * Entity representing clinical Treatment Template for a medical facility.
 */
@Entity('treatment_templates')
export class TreatmentTemplate extends BaseEntity {
  @ApiProperty({ description: 'Facility ID owning this template', example: 'f901ab23-1122-3344-5566-778899aabbcc' })
  @Column({ type: 'uuid' })
  facilityId: string;

  @ManyToOne(() => Facility, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'facility_id' })
  facility?: Facility;

  @ApiProperty({ description: 'Template title/name', example: 'Phác đồ kiểm soát Tăng huyết áp Độ 1 kèm ĐTĐ' })
  @Column({ type: 'varchar', length: 255 })
  templateName: string;

  @ApiPropertyOptional({ description: 'Disease category (Tim mạch, Chuyển hóa...)', example: 'Tim mạch' })
  @Column({ type: 'varchar', length: 100, nullable: true })
  diseaseCategory?: string | null;

  @ApiProperty({ description: 'Clinical protocol content in Markdown or JSON format' })
  @Column({ type: 'text' })
  content: string;

  @ApiProperty({ description: 'Active status of template', default: true })
  @Column({ type: 'boolean', default: true })
  isActive: boolean;
}
