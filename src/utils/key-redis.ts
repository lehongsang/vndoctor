import * as crypto from 'crypto';

/**
 * Utilities for generating Redis keys.
 */

export const getRegistrationUserKey = (email: string): string => {
  return `registration_user:${email.trim().toLowerCase()}`;
};

export const getOtpAttemptsKey = (email: string): string => {
  return `registration_user_otp_attempts:${email.trim().toLowerCase()}`;
};

export const getRegistrationRateLimitKey = (email: string): string => {
  return `registration_rate_limit:${email.trim().toLowerCase()}`;
};

export const getBlacklistTokenKey = (token: string): string => {
  const hash = crypto.createHash('sha256').update(token.trim()).digest('hex');
  return `blacklist:token:${hash}`;
};

export const getAppOtpKey = (purpose: string, phone: string): string => {
  return `otp:${purpose.toLowerCase()}:${phone.trim()}`;
};

export const getAppOtpAttemptsKey = (purpose: string, phone: string): string => {
  return `otp:attempts:${purpose.toLowerCase()}:${phone.trim()}`;
};

export const getAppOtpCooldownKey = (purpose: string, phone: string): string => {
  return `otp:cooldown:${purpose.toLowerCase()}:${phone.trim()}`;
};



