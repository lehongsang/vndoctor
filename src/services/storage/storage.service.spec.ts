import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { ConfigService } from '@nestjs/config';
import type { Repository } from 'typeorm';
import type { Media } from './entities/media.entity';
import { StorageService } from './storage.service';

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

describe('StorageService', () => {
  const mockedGetSignedUrl = getSignedUrl as jest.MockedFunction<
    typeof getSignedUrl
  >;

  /**
   * Builds a storage service with minimal repository/config mocks.
   */
  function createService(configOverrides: Record<string, string> = {}): StorageService {
    const mediaRepository = {} as Repository<Media>;
    const configService = {
      get: jest.fn((key: string, defaultValue?: string) => {
        const values: Record<string, string> = {
          S3_BUCKET: 'medias',
          S3_REGION: 'us-east-1',
          S3_ACCESS_KEY: 'admin',
          S3_SECRET_KEY: 'change-me',
          S3_FORCE_PATH_STYLE: 'true',
          ...configOverrides,
        };
        return values[key] ?? defaultValue;
      }),
    } as unknown as ConfigService;

    return new StorageService(mediaRepository, configService);
  }

  beforeEach(() => {
    mockedGetSignedUrl.mockReset();
  });

  it('signs download URLs with safe attachment content disposition', async () => {
    mockedGetSignedUrl.mockImplementation((_client, command) => {
      const input = (command as {
        input: { ResponseContentDisposition?: string };
      }).input;
      return Promise.resolve(
        `https://signed.local/object?disposition=${encodeURIComponent(
          input.ResponseContentDisposition ?? '',
        )}`,
      );
    });
    const service = createService();

    const url = await service.getPresignedDownloadUrl(
      'chat/script.js',
      'Báo cáo "x"\r\n.js',
    );
    const command = mockedGetSignedUrl.mock.calls[0]?.[1] as {
      input: { ResponseContentDisposition?: string };
    };

    expect(url).toContain('disposition=');
    expect(command.input.ResponseContentDisposition).toContain('attachment;');
    expect(command.input.ResponseContentDisposition).toContain('filename=');
    expect(command.input.ResponseContentDisposition).toContain(
      "filename*=UTF-8''",
    );
    expect(command.input.ResponseContentDisposition).not.toContain('\r');
    expect(command.input.ResponseContentDisposition).not.toContain('\n');
  });

  it('uses a 30-day default expiry for presigned URLs', async () => {
    mockedGetSignedUrl.mockResolvedValue('https://signed.local/default-expiry');
    const service = createService();

    await service.getPresignedUrl('chat/file.pdf');

    expect(mockedGetSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ expiresIn: 60 * 60 * 24 * 30 }),
    );
  });

  it('allows the default presigned URL expiry to be configured', async () => {
    mockedGetSignedUrl.mockResolvedValue('https://signed.local/custom-expiry');
    const service = createService({
      S3_PRESIGNED_URL_EXPIRES_IN_SECONDS: '604800',
    });

    await service.getPresignedDownloadUrl('chat/file.pdf', 'file.pdf');

    expect(mockedGetSignedUrl).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ expiresIn: 604800 }),
    );
  });

  it('keeps inline and download presigned URL cache entries separate', async () => {
    mockedGetSignedUrl
      .mockResolvedValueOnce('https://signed.local/inline')
      .mockResolvedValueOnce('https://signed.local/download');
    const service = createService();

    await service.getPresignedUrl('chat/file.js');
    await service.getPresignedDownloadUrl('chat/file.js', 'file.js');
    await service.getPresignedUrl('chat/file.js');
    await service.getPresignedDownloadUrl('chat/file.js', 'file.js');

    expect(mockedGetSignedUrl).toHaveBeenCalledTimes(2);
  });
});
