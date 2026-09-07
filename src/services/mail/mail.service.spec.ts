import type { MailerService } from '@nestjs-modules/mailer';
import type { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

describe('MailService', () => {
  /**
   * Builds MailService with a mocked SMTP adapter and seed-runner flag.
   */
  function createService(seedRunner: boolean): {
    service: MailService;
    mailerService: Pick<MailerService, 'sendMail'>;
  } {
    const mailerService: Pick<MailerService, 'sendMail'> = {
      sendMail: jest.fn().mockResolvedValue(undefined),
    };
    const configService = {
      get: jest.fn((key: string, fallback?: string) => {
        if (key === 'NAVI_SEED_RUNNER') return seedRunner ? 'true' : undefined;
        return fallback;
      }),
    } as unknown as ConfigService;

    return {
      service: new MailService(mailerService as MailerService, configService),
      mailerService,
    };
  }

  it('does not send OTP mail while seed runner is active', async () => {
    const { service, mailerService } = createService(true);

    await expect(service.sendOtp('seed@navi.local', '123456')).resolves.toBe(
      true,
    );
    expect(mailerService.sendMail).not.toHaveBeenCalled();
  });

  it('does not send verification mail while seed runner is active', async () => {
    const { service, mailerService } = createService(true);

    await expect(
      service.sendVerificationEmail('seed@navi.local', 'https://example.test'),
    ).resolves.toBe(true);
    expect(mailerService.sendMail).not.toHaveBeenCalled();
  });

  it('does not send password reset mail while seed runner is active', async () => {
    const { service, mailerService } = createService(true);

    await expect(
      service.sendPasswordReset('seed@navi.local', 'https://example.test'),
    ).resolves.toBe(true);
    expect(mailerService.sendMail).not.toHaveBeenCalled();
  });

  it('sends mail normally outside the seed runner', async () => {
    const { service, mailerService } = createService(false);

    await expect(service.sendOtp('user@navi.local', '123456')).resolves.toBe(
      true,
    );
    expect(mailerService.sendMail).toHaveBeenCalledTimes(1);
  });
});
