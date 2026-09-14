import { ApiProperty } from '@nestjs/swagger';
import { BeforeInsert, Column, DeleteDateColumn, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { v7 as uuidv7 } from 'uuid';

export class BaseEntity {
  @ApiProperty()
  @PrimaryColumn({ type: 'uuid' })
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv7();
    }
  }

  @ApiProperty()
  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;

  @ApiProperty({ required: false, nullable: true })
  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date | null;
}
