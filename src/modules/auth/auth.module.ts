import { Module } from '@nestjs/common';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';
import { getAuth } from './auth';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';
import { RedisService } from '@/services/redis/redis.service';
import { MailQueueService } from '@/services/mail/mail-queue.service';
import { MailModule } from '@/services/mail/mail.module';

@Module({
  imports: [
    MailModule,
    BetterAuthModule.forRootAsync({
      inject: [ConfigService, 'PG_POOL', RedisService, MailQueueService],
      useFactory: (
        configService: ConfigService,
        pool: Pool,
        redisService: RedisService,
        mailQueueService: MailQueueService,
      ) => ({
        auth: getAuth(pool, configService, redisService, mailQueueService),
      }),
    }),
  ],
  exports: [BetterAuthModule],
})
export class AuthModule {}
