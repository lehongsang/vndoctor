import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { MailService } from './mail.service';
import {
  MAIL_QUEUE,
  MailJobName,
  type MailSendOtpPayload,
  type MailSendPasswordResetPayload,
  type MailSendVerificationPayload,
} from './mail-queue.types';

/**
 * Consumes mail jobs from BullMQ and delegates SMTP sending to {@link MailService}.
 */
@Processor(MAIL_QUEUE)
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(private readonly mailService: MailService) {
    super();
  }

  /**
   * Dispatches a job to the appropriate mailer based on {@link Job.name}.
   */
  async process(job: Job): Promise<boolean> {
    const name = job.name;
    if (name === MailJobName.SendOtp) {
      const { email, otp, expiresInMinutes } = job.data as MailSendOtpPayload;
      return this.mailService.sendOtp(email, otp, expiresInMinutes);
    }
    if (name === MailJobName.SendPasswordReset) {
      const { email, url } = job.data as MailSendPasswordResetPayload;
      return this.mailService.sendPasswordReset(email, url);
    }
    if (name === MailJobName.SendVerificationEmail) {
      const { email, url } = job.data as MailSendVerificationPayload;
      return this.mailService.sendVerificationEmail(email, url);
    }
    this.logger.warn(`Unknown mail job name: ${String(job.name)}`);
    return false;
  }
}
