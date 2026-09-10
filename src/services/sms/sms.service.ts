import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@/commons/logger/logger.service';

/**
 * Lightweight SMS gateway abstraction for OTP delivery.
 *
 * Current implementation is a safe fallback that logs delivery attempts.
 * Replace `sendOtp` internals with an actual provider integration.
 */
@Injectable()
export class SmsService {
  private readonly logger = new LoggerService(SmsService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Checks whether the current SMS provider is mock.
   */
  isMockProvider(): boolean {
    const smsProvider = this.configService.get<string>('SMS_PROVIDER', 'mock');
    return smsProvider === 'mock';
  }

  /**
   * Sends an OTP message to a phone number.
   */
  async sendOtp(phoneNumber: string, otp: string, ttlMinutes: number): Promise<void> {
    const senderId = this.configService.get<string>('SMS_SENDER_ID', 'NAVI');
    const smsProvider = this.configService.get<string>('SMS_PROVIDER', 'mock');

    if (smsProvider === 'mock') {
      this.logger.log(
        `[SMS:mock] =======================================================`,
      );
      this.logger.log(
        `[SMS:mock] 📱 MÃ OTP GỬI TỚI ${phoneNumber}: >>> ${otp} <<< (Hạn ${ttlMinutes} phút)`,
      );
      this.logger.log(
        `[SMS:mock] =======================================================`,
      );
    } else {
      this.logger.log(
        `[SMS:${smsProvider}] queued OTP delivery via ${senderId} to ${this.maskPhone(
          phoneNumber,
        )} (ttl=${ttlMinutes}m)`,
      );
    }

    await Promise.resolve();
  }

  /**
   * Masks phone number for safer logs.
   */
  private maskPhone(phoneNumber: string): string {
    if (phoneNumber.length <= 4) {
      return '****';
    }
    return `${'*'.repeat(Math.max(0, phoneNumber.length - 4))}${phoneNumber.slice(-4)}`;
  }
}
