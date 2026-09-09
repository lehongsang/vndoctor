import { Account } from '@/modules/accounts/entities/account.entity';
import { PatientCareSubscription } from '@/modules/care-subscriptions/entities/care-subscription.entity';
import { Conversation } from '@/modules/care-subscriptions/entities/conversation.entity';
import { Message } from '@/modules/care-subscriptions/entities/message.entity';
import { HealthProfile } from '@/modules/health-profiles/entities/health-profile.entity';
import { StaffUser } from '@/modules/staff/entities/staff-user.entity';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';
import { ChatGateway } from './gateways/chat.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Conversation,
      Message,
      HealthProfile,
      StaffUser,
      Account,
      PatientCareSubscription,
    ]),
  ],
  controllers: [ConversationsController],
  providers: [ConversationsService, ChatGateway],
  exports: [ConversationsService, ChatGateway],
})
export class ConversationsModule {}
