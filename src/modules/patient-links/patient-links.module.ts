import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FacilityPatientLink } from './entities/facility-patient-link.entity';
import { PatientLinksService } from './patient-links.service';
import { PatientLinksController } from './patient-links.controller';
import { FacilitiesModule } from '@/modules/facilities/facilities.module';
import { HealthProfilesModule } from '@/modules/health-profiles/health-profiles.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FacilityPatientLink]),
    FacilitiesModule,
    HealthProfilesModule,
  ],
  controllers: [PatientLinksController],
  providers: [PatientLinksService],
  exports: [PatientLinksService],
})
export class PatientLinksModule {}
