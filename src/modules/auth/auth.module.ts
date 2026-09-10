import { Module } from '@nestjs/common';
import { MailModule } from '@/services/mail/mail.module';
import { RedisModule } from '@/services/redis/redis.module';
import { VnDoctorAuthService } from './vndoctor-auth.service';
import { VnDoctorAuthController } from './vndoctor-auth.controller';
import { StaffModule } from '@/modules/staff/staff.module';
import { AccountsModule } from '@/modules/accounts/accounts.module';

@Module({
  imports: [
    MailModule,
    RedisModule,
    StaffModule,
    AccountsModule,
  ],
  controllers: [VnDoctorAuthController],
  providers: [VnDoctorAuthService],
  exports: [VnDoctorAuthService],
})
export class AuthModule {}
