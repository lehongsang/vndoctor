import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientLinksService } from './patient-links.service';
import { PatientLinksController } from './patient-links.controller';
import { FacilitiesModule } from '@/modules/facilities/facilities.module';
import { HealthProfilesModule } from '@/modules/health-profiles/health-profiles.module';
import { PatientLinksSseService } from './patient-links-sse.service';
import { Account } from '@/modules/accounts/entities/account.entity';
import { HealthProfile } from '@/modules/health-profiles/entities/health-profile.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Account, HealthProfile]),
    FacilitiesModule,
    HealthProfilesModule,
  ],
  controllers: [PatientLinksController],
  providers: [PatientLinksService, PatientLinksSseService],
  exports: [PatientLinksService, PatientLinksSseService],
})
export class PatientLinksModule {}
