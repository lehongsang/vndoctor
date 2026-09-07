import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Media, MediaStatus } from './entities/media.entity';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import * as path from 'path';
import { StoragePath } from './storage.enums';
@Injectable()
export class StorageService {
  private static readonly PRESIGNED_URL_CACHE_MAX = 2000;

  private static readonly DEFAULT_PRESIGNED_URL_EXPIRES_IN_SECONDS =
    60 * 60 * 24 * 30;

  /**
   * Reuse presigned GET URLs briefly to avoid repeated AWS signing on hot paths
   * (e.g. conversation lists with many participant avatars). Entries expire before
   * the underlying S3 URL so clients never receive an already-expired link.
   */
  private readonly presignedUrlCache = new Map<string, { url: string; staleAt: number }>();

  private readonly logger = new Logger(StorageService.name);
  private s3Client: S3Client;
  private signingClient: S3Client;
  private readonly bucket: string;
  private readonly defaultPresignedUrlExpiresInSeconds: number;

  constructor(
    @InjectRepository(Media)
    private readonly mediaRepository: Repository<Media>,
    private readonly configService: ConfigService,
  ) {
    this.bucket = this.configService.get<string>('S3_BUCKET', 'medias')!;
    this.defaultPresignedUrlExpiresInSeconds =
      this.resolveDefaultPresignedUrlExpiresInSeconds();

    const endpoint = this.configService.get<string>('S3_ENDPOINT');
    const externalUrl =
      this.configService.get<string>('S3_EXTERNAL_URL') || endpoint;
    const region = this.configService.get<string>('S3_REGION', 'us-east-1');
    const accessKeyId = this.configService.get<string>('S3_ACCESS_KEY', '');
    const secretAccessKey = this.configService.get<string>('S3_SECRET_KEY', '');
    const forcePathStyle =
      this.configService.get<string>('S3_FORCE_PATH_STYLE', 'true') !== 'false';

    const commonConfig = {
      region,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle,
      requestChecksumCalculation: 'WHEN_REQUIRED' as const,
      responseChecksumValidation: 'WHEN_REQUIRED' as const,
    };

    this.s3Client = new S3Client({
      ...commonConfig,
      endpoint: (endpoint as string) || undefined,
    });

    this.signingClient = new S3Client({
      ...commonConfig,
      endpoint: (externalUrl as string) || undefined,
    });
  }


  async uploadFile(
    file: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    },
    isSync = true,
    folder: string | StoragePath = StoragePath.UPLOADS,
    options?: {
      allowAnyMime?: boolean;
    },
  ) {
    const cleanFolder = folder.replace(/^\/+|\/+$/g, '');
    const allowAnyMime = options?.allowAnyMime ?? false;

    if (!allowAnyMime && !file.mimetype.startsWith('image/')) {
      throw new Error('Only image files are allowed');
    }

    const originalNameWithoutExt = path.parse(file.originalname).name;
    const originalExtension = path.extname(file.originalname);

    let processedBuffer: Buffer;
    let filename: string;
    let mimeType: string;

    if (file.mimetype.startsWith('image/')) {
      processedBuffer = await sharp(file.buffer)
        .resize(2000, 2000, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 80 })
        .toBuffer();
      filename = `${Date.now()}-${originalNameWithoutExt}.webp`;
      mimeType = 'image/webp';
    } else {
      processedBuffer = file.buffer;
      filename = `${Date.now()}-${originalNameWithoutExt}${originalExtension}`;
      mimeType = file.mimetype;
    }

    const key = cleanFolder ? `${cleanFolder}/${filename}` : filename;

    const media = this.mediaRepository.create({
      filename,
      originalName: file.originalname,
      mimeType: mimeType,
      size: processedBuffer.length,
      status: MediaStatus.PENDING,
      s3Key: key,
      url: '',
    });

    const savedMedia = await this.mediaRepository.save(media);

    if (!isSync) {
      this.logger.warn(
        'Async Kafka upload is disabled; uploading synchronously to object storage.',
      );
    }

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: processedBuffer,
          ContentType: mimeType,
        }),
      );

      await this.mediaRepository.update(savedMedia.id, {
        status: MediaStatus.COMPLETED,
      });

      const completedMedia = Object.assign(savedMedia, {
        status: MediaStatus.COMPLETED,
        url: (await this.getPresignedUrl(key)) || '',
      });
      return completedMedia;
    } catch (error) {
      this.logger.error(`Upload failed for ${filename}`, error);
      await this.mediaRepository.update(savedMedia.id, {
        status: MediaStatus.FAILED,
      });
      throw error;
    }
  }

  async deleteFile(mediaId: string) {
    const media = await this.mediaRepository.findOne({
      where: { id: mediaId },
    });

    if (!media) {
      return;
    }

    if (media.s3Key) {
      try {
        await this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: this.bucket,
            Key: media.s3Key,
          }),
        );
        this.invalidatePresignedUrlCacheForS3Key(media.s3Key);
      } catch (error) {
        this.logger.error(
          `Failed to delete S3 object for mediaId: ${mediaId}`,
          error,
        );
      }
    }

    try {
      await this.mediaRepository.remove(media);
    } catch (error: unknown) {
      const dbError = error as { code?: string };
      if (dbError.code === '23503') {
        this.logger.warn(
          `Could not delete media record ${mediaId} because it is still referenced by another table. Metadata will remain but file content may have been removed.`,
        );
      } else {
        throw error;
      }
    }
  }

  /**
   * Returns a time-limited GET URL for an object key. Results are cached in-process
   * for a fraction of the URL lifetime to reduce signing load under repeated reads.
   */
  async getPresignedUrl(
    key: string | null | undefined,
    expiresInSeconds?: number,
  ): Promise<string | null> {
    if (!key) {
      return null;
    }
    const resolvedExpiresInSeconds =
      this.resolvePresignedUrlExpiresInSeconds(expiresInSeconds);

    const cacheKey = this.buildPresignCacheKey(
      key,
      resolvedExpiresInSeconds,
      'inline',
    );
    const hit = this.presignedUrlCache.get(cacheKey);
    if (hit !== undefined && hit.staleAt > Date.now()) {
      return hit.url;
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const url = await getSignedUrl(this.signingClient, command, {
        expiresIn: resolvedExpiresInSeconds,
      });

      if (url) {
        this.rememberPresignedUrl(cacheKey, url, resolvedExpiresInSeconds);
      }

      return url;
    } catch (error) {
      this.logger.error(
        `Failed to generate presigned URL for key: ${key}`,
        error,
      );
      return null;
    }
  }

  /**
   * Returns a time-limited GET URL that asks browsers to download the object.
   */
  async getPresignedDownloadUrl(
    key: string | null | undefined,
    filename: string | null | undefined,
    expiresInSeconds?: number,
  ): Promise<string | null> {
    if (!key) {
      return null;
    }
    const resolvedExpiresInSeconds =
      this.resolvePresignedUrlExpiresInSeconds(expiresInSeconds);

    const contentDisposition = this.buildAttachmentContentDisposition(filename);
    const cacheKey = this.buildPresignCacheKey(
      key,
      resolvedExpiresInSeconds,
      'attachment',
      contentDisposition,
    );
    const hit = this.presignedUrlCache.get(cacheKey);
    if (hit !== undefined && hit.staleAt > Date.now()) {
      return hit.url;
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ResponseContentDisposition: contentDisposition,
      });

      const url = await getSignedUrl(this.signingClient, command, {
        expiresIn: resolvedExpiresInSeconds,
      });

      if (url) {
        this.rememberPresignedUrl(cacheKey, url, resolvedExpiresInSeconds);
      }

      return url;
    } catch (error) {
      this.logger.error(
        `Failed to generate presigned download URL for key: ${key}`,
        error,
      );
      return null;
    }
  }

  /**
   * Reads the default presigned URL lifetime from config with a 30-day fallback.
   */
  private resolveDefaultPresignedUrlExpiresInSeconds(): number {
    const configuredValue = this.configService.get<string>(
      'S3_PRESIGNED_URL_EXPIRES_IN_SECONDS',
    );
    const parsedValue = Number(configuredValue);
    if (Number.isFinite(parsedValue) && parsedValue > 0) {
      return Math.floor(parsedValue);
    }
    return StorageService.DEFAULT_PRESIGNED_URL_EXPIRES_IN_SECONDS;
  }

  /**
   * Resolves an explicit method-level expiry or falls back to the configured default.
   */
  private resolvePresignedUrlExpiresInSeconds(
    expiresInSeconds: number | undefined,
  ): number {
    if (Number.isFinite(expiresInSeconds) && Number(expiresInSeconds) > 0) {
      return Math.floor(Number(expiresInSeconds));
    }
    return this.defaultPresignedUrlExpiresInSeconds;
  }

  /**
   * Builds a cache key that stays unique per object key, expiry, and response mode.
   */
  private buildPresignCacheKey(
    key: string,
    expiresInSeconds: number,
    mode: 'inline' | 'attachment',
    variant = '',
  ): string {
    return `${expiresInSeconds}\u0000${mode}\u0000${variant}\u0000${key}`;
  }

  /**
   * Builds a safe Content-Disposition value with ASCII fallback and UTF-8 filename.
   */
  private buildAttachmentContentDisposition(
    filename: string | null | undefined,
  ): string {
    const safeFilename = this.sanitizeDownloadFilename(filename);
    const asciiFallback =
      safeFilename
        .replace(/[^\x20-\x7E]/g, '_')
        .replace(/["\\]/g, '_')
        .trim() || 'download';
    const encodedFilename = this.encodeRfc5987ValueChars(safeFilename);
    return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedFilename}`;
  }

  /**
   * Removes header-breaking characters and path fragments from a download filename.
   */
  private sanitizeDownloadFilename(filename: string | null | undefined): string {
    const basename = path.basename((filename ?? '').replace(/\\/g, '/'));
    const cleaned = basename.replace(/[\r\n"]/g, '').trim();
    return cleaned || 'download';
  }

  /**
   * Encodes a UTF-8 filename according to RFC 5987 for Content-Disposition.
   */
  private encodeRfc5987ValueChars(value: string): string {
    return encodeURIComponent(value).replace(
      /['()*]/g,
      (character) =>
        `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
    );
  }

  /**
   * Stores a presigned URL until 85% of its S3 lifetime elapses, then evicts under pressure.
   */
  private rememberPresignedUrl(
    cacheKey: string,
    url: string,
    expiresInSeconds: number,
  ): void {
    const staleAt = Date.now() + Math.floor(expiresInSeconds * 1000 * 0.85);
    if (this.presignedUrlCache.size >= StorageService.PRESIGNED_URL_CACHE_MAX) {
      const head = this.presignedUrlCache.keys().next();
      if (!head.done && typeof head.value === 'string') {
        this.presignedUrlCache.delete(head.value);
      }
    }
    this.presignedUrlCache.set(cacheKey, { url, staleAt });
  }

  /**
   * Drops cached presigned URLs for a given S3 object key (all expiry variants).
   */
  private invalidatePresignedUrlCacheForS3Key(s3Key: string): void {
    for (const cacheKey of this.presignedUrlCache.keys()) {
      const sep = cacheKey.indexOf('\u0000');
      if (sep === -1) {
        continue;
      }
      if (cacheKey.endsWith(`\u0000${s3Key}`)) {
        this.presignedUrlCache.delete(cacheKey);
      }
    }
  }
}
