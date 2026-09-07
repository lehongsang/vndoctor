import { Global, Module } from '@nestjs/common';
import { RedisModule } from './redis/redis.module';
import { MailModule } from './mail/mail.module';
import { StorageModule } from './storage/storage.module';
import { SmsModule } from './sms/sms.module';

@Global()
@Module({
  imports: [RedisModule, MailModule, StorageModule, SmsModule],
  exports: [RedisModule, MailModule, StorageModule, SmsModule],
})
export class ServicesModule {}
