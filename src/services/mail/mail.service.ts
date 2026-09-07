import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import type SMTPPool from 'nodemailer/lib/smtp-pool';

@Injectable()
export class MailService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MailService.name);
  private readonly smtpConfig: SMTPPool.Options;
  private readonly mailFrom: string;
  private transporter: nodemailer.Transporter | null = null;

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {
    this.smtpConfig = this.buildSmtpConfig();
    this.mailFrom = this.resolveMailFrom();
  }

  /**
   * Creates and verifies the pooled notification SMTP transporter once at startup.
   */
  onModuleInit(): void {
    // Seed runs should not require a live SMTP connection.
    if (this.shouldSkipDeliveryForSeedRunner()) {
      return;
    }

    this.transporter = nodemailer.createTransport(this.smtpConfig);
    if (this.hasCompleteSmtpConfig()) {
      // Verify SMTP asynchronously so unreachable SMTP servers do not block app startup.
      void this.transporter
        .verify()
        .then(() => {
          this.logger.log('Notification SMTP transporter verified');
        })
        .catch((error: unknown) => {
          this.logger.error(
            `Failed to verify notification SMTP transporter: ${this.toErrorMessage(error)}`,
            error instanceof Error ? error.stack : undefined,
          );
        });
      return;
    }

    this.logger.warn(
      'Notification SMTP transporter was created without complete MAIL_* configuration',
    );
  }

  /**
   * Closes pooled SMTP connections during application shutdown.
   */
  onModuleDestroy(): void {
    this.transporter?.close();
  }

  /**
   * Sends a plain notification email for outbound campaign delivery.
   */
  async sendNotificationEmail(input: {
    email: string;
    subject: string;
    body: string;
  }): Promise<{ messageId: string | null; response: Record<string, unknown> }> {
    // Seeds should only write deterministic DB data and must not hit SMTP.
    if (this.shouldSkipDeliveryForSeedRunner()) {
      return {
        messageId: 'seed-runner-skipped',
        response: { skipped: true },
      };
    }

    const transporter = this.getNotificationTransporter();
    const result = (await transporter.sendMail({
      from: this.mailFrom,
      to: input.email,
      subject: input.subject,
      text: input.body,
      html: `<p>${this.escapeHtml(input.body)}</p>`,
    })) as unknown;
    const response = this.toRecord(result);

    return {
      messageId:
        typeof response.messageId === 'string' ? response.messageId : null,
      response,
    };
  }

  /**
   * Sends an OTP email unless the current process is the seed runner.
   */
  async sendOtp(
    email: string,
    otp: string,
    expiresInMinutes: number = 5,
  ): Promise<boolean> {
    // Seeds should only write deterministic DB data and must not hit SMTP.
    if (this.shouldSkipDeliveryForSeedRunner()) return true;

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Your 2FA OTP Code',
        template: './otp', // path to hbs file without extension
        context: {
          subject: 'Verification Code',
          otp,
          expiresIn: expiresInMinutes,
          currentYear: new Date().getFullYear(),
          appName: this.configService.get<string>('APP_NAME', 'Nest Base'),
        },
      });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send OTP to ${email}: ${message}`);
      return false;
    }
  }

  /**
   * Sends a verification email unless the current process is the seed runner.
   */
  async sendVerificationEmail(email: string, url: string): Promise<boolean> {
    // Seeds should only write deterministic DB data and must not hit SMTP.
    if (this.shouldSkipDeliveryForSeedRunner()) return true;

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Verify your email address',
        template: './verification',
        context: {
          url,
          currentYear: new Date().getFullYear(),
          appName: this.configService.get<string>('APP_NAME', 'Nest Base'),
        },
      });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to send verification email to ${email}: ${message}`,
      );
      return false;
    }
  }

  /**
   * Sends a password reset email unless the current process is the seed runner.
   */
  async sendPasswordReset(email: string, url: string): Promise<boolean> {
    // Seeds should only write deterministic DB data and must not hit SMTP.
    if (this.shouldSkipDeliveryForSeedRunner()) return true;

    try {
      await this.mailerService.sendMail({
        to: email,
        subject: 'Reset your password',
        template: './password-reset',
        context: {
          url,
          currentYear: new Date().getFullYear(),
          appName: this.configService.get<string>('APP_NAME', 'Nest Base'),
        },
      });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to send password reset email to ${email}: ${message}`,
      );
      return false;
    }
  }

  /**
   * Detects seed execution so queued mail jobs are acknowledged without SMTP.
   */
  private shouldSkipDeliveryForSeedRunner(): boolean {
    return this.configService.get<string>('NAVI_SEED_RUNNER') === 'true';
  }

  /**
   * Reads MAIL_PORT as a number even when dotenv provides a string value.
   */
  private resolveMailPort(): number {
    const value = this.configService.get<string | number>('MAIL_PORT', 587);
    const port = Number(value);
    return Number.isFinite(port) ? port : 587;
  }

  /**
   * Builds cached SMTP options for notification email delivery.
   */
  private buildSmtpConfig(): SMTPPool.Options {
    return {
      host: this.configService.get<string>('MAIL_HOST'),
      port: this.resolveMailPort(),
      secure: this.configService.get<string>('MAIL_SECURE') === 'true',
      auth: {
        user: this.configService.get<string>('MAIL_USER'),
        pass: this.configService.get<string>('MAIL_PASS'),
      },
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      tls: {
        rejectUnauthorized:
          this.configService.get<string>('NODE_ENV') !== 'development',
      },
    };
  }

  /**
   * Returns the singleton notification transporter, creating it lazily in tests.
   */
  private getNotificationTransporter(): nodemailer.Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport(this.smtpConfig);
    }
    return this.transporter;
  }

  /**
   * Checks whether the required SMTP credentials are present.
   */
  private hasCompleteSmtpConfig(): boolean {
    return Boolean(
      this.smtpConfig.host &&
        this.smtpConfig.port &&
        this.configService.get<string>('MAIL_USER') &&
        this.configService.get<string>('MAIL_PASS'),
    );
  }

  /**
   * Resolves a valid From header and falls back to MAIL_USER when MAIL_FROM is absent.
   */
  private resolveMailFrom(): string {
    const configuredFrom = this.configService.get<string>('MAIL_FROM')?.trim();
    if (configuredFrom) {
      return configuredFrom;
    }

    const mailUser = this.configService.get<string>('MAIL_USER')?.trim();
    return mailUser ?? 'no-reply@navi.local';
  }

  /**
   * Escapes text before embedding it in simple HTML mail.
   */
  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Extracts a stable error message for logs.
   */
  private toErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }

  /**
   * Converts provider responses to JSON-safe records for audit storage.
   */
  private toRecord(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return { value };
  }
}
