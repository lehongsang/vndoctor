/** BullMQ queue name for outbound mail. */
export const MAIL_QUEUE = 'mail' as const;

/** Job name strings on {@link MAIL_QUEUE}. */
export const MailJobName = {
  SendOtp: 'send-otp',
  SendPasswordReset: 'send-password-reset',
  SendVerificationEmail: 'send-verification-email',
} as const;

export type MailJobNameString =
  (typeof MailJobName)[keyof typeof MailJobName];

export interface MailSendOtpPayload {
  readonly email: string;
  readonly otp: string;
  readonly expiresInMinutes: number;
}

export interface MailSendPasswordResetPayload {
  readonly email: string;
  readonly url: string;
}

export interface MailSendVerificationPayload {
  readonly email: string;
  readonly url: string;
}
