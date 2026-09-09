import { CarePackage } from '@/modules/care-packages/entities/care-package.entity';
import { HealthProfile } from '@/modules/health-profiles/entities/health-profile.entity';
import { StaffUser } from '@/modules/staff/entities/staff-user.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CareSubscriptionsController } from './care-subscriptions.controller';
import { CareSubscriptionsService } from './care-subscriptions.service';
import { PatientCareSubscription } from './entities/care-subscription.entity';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PatientCareSubscription,
      CarePackage,
      HealthProfile,
      StaffUser,
      Conversation,
      Message,
    ]),
  ],
  controllers: [CareSubscriptionsController],
  providers: [CareSubscriptionsService],
  exports: [CareSubscriptionsService],
})
export class CareSubscriptionsModule {}
