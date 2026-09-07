import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { JobsOptions, Queue } from 'bullmq';
import {
  MAIL_QUEUE,
  MailJobName,
  type MailSendOtpPayload,
  type MailSendPasswordResetPayload,
  type MailSendVerificationPayload,
} from './mail-queue.types';

const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 3000,
  },
  removeOnComplete: true,
  removeOnFail: 100,
};

/**
 * Enqueues mail jobs on Redis (BullMQ). Workers send via {@link MailService}.
 */
@Injectable()
export class MailQueueService {
  constructor(@InjectQueue(MAIL_QUEUE) private readonly mailQueue: Queue) {}

  /**
   * Queues an OTP email for asynchronous delivery.
   */
  async enqueueSendOtp(
    email: string,
    otp: string,
    expiresInMinutes: number = 5,
  ): Promise<void> {
    const payload: MailSendOtpPayload = {
      email,
      otp,
      expiresInMinutes,
    };
    await this.mailQueue.add(MailJobName.SendOtp, payload, DEFAULT_JOB_OPTIONS);
  }

  /**
   * Queues a password reset email for asynchronous delivery.
   */
  async enqueueSendPasswordReset(email: string, url: string): Promise<void> {
    const payload: MailSendPasswordResetPayload = { email, url };
    await this.mailQueue.add(
      MailJobName.SendPasswordReset,
      payload,
      DEFAULT_JOB_OPTIONS,
    );
  }

  /**
   * Queues an email verification message for asynchronous delivery.
   */
  async enqueueSendVerificationEmail(
    email: string,
    url: string,
  ): Promise<void> {
    const payload: MailSendVerificationPayload = { email, url };
    await this.mailQueue.add(
      MailJobName.SendVerificationEmail,
      payload,
      DEFAULT_JOB_OPTIONS,
    );
  }
}
