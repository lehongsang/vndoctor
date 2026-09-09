import { PatientCareSubscription } from '@/modules/care-subscriptions/entities/care-subscription.entity';
import { Conversation } from '@/modules/care-subscriptions/entities/conversation.entity';
import { Message } from '@/modules/care-subscriptions/entities/message.entity';
import { Facility } from '@/modules/facilities/entities/facility.entity';
import { StaffUser } from '@/modules/staff/entities/staff-user.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CareRequestsController } from './care-requests.controller';
import { CareRequestsService } from './care-requests.service';
import { PatientCareRequest } from './entities/care-request.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PatientCareRequest,
      PatientCareSubscription,
      Facility,
      StaffUser,
      Conversation,
      Message,
    ]),
  ],
  controllers: [CareRequestsController],
  providers: [CareRequestsService],
  exports: [CareRequestsService],
})
export class CareRequestsModule {}
