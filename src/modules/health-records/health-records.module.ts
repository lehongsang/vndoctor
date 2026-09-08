import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthRecord } from './entities/health-record.entity';
import { HealthProfile } from '@/modules/health-profiles/entities/health-profile.entity';
import { HealthRecordsService } from './health-records.service';
import { HealthRecordsController } from './health-records.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([HealthRecord, HealthProfile]),
  ],
  controllers: [HealthRecordsController],
  providers: [HealthRecordsService],
  exports: [HealthRecordsService],
})
export class HealthRecordsModule {}
