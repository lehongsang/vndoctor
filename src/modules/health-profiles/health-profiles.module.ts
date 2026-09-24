import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthProfile } from './entities/health-profile.entity';
import { HealthProfilesService } from './health-profiles.service';
import { HealthProfilesController } from './health-profiles.controller';
import { Account } from '@/modules/accounts/entities/account.entity';
import { PatientCareSubscription } from '@/modules/care-subscriptions/entities/care-subscription.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([HealthProfile, Account, PatientCareSubscription]),
  ],
  controllers: [HealthProfilesController],
  providers: [HealthProfilesService],
  exports: [HealthProfilesService],
})
export class HealthProfilesModule {}
