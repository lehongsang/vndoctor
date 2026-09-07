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
   * Sends an OTP message to a phone number.
   */
  async sendOtp(phoneNumber: string, otp: string, ttlMinutes: number): Promise<void> {
    const senderId = this.configService.get<string>('SMS_SENDER_ID', 'NAVI');
    const smsProvider = this.configService.get<string>('SMS_PROVIDER', 'mock');

    // Intentionally avoid logging full OTP/phone in production environments.
    this.logger.log(
      `[SMS:${smsProvider}] queued OTP delivery via ${senderId} to ${this.maskPhone(
        phoneNumber,
      )} (ttl=${ttlMinutes}m)`,
    );

    if (this.configService.get<string>('NODE_ENV') !== 'production') {
      this.logger.debug(`[SMS:${smsProvider}] otp=${otp}`);
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
