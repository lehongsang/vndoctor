import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import {
  JWTPayload,
  createRemoteJWKSet,
  errors as JoseErrors,
  jwtVerify,
} from 'jose';

interface JwtLikePayload {
  sub?: unknown;
  userId?: unknown;
  id?: unknown;
  [key: string]: unknown;
}

/**
 * Guard JWT stateless, dùng để kiểm tra header `Authorization: Bearer <jwt>`.
 *
 * Guard này verify access token do Better Auth phát hành bằng public key
 * lấy từ JWKS endpoint (`/api/auth/jwks`), thay vì dùng shared secret HS256.
 */
@Injectable()
export class JwtTokenGuard implements CanActivate {
  private readonly jwksUrl: URL;
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;
  private readonly algorithms: string[];

  constructor(private readonly configService: ConfigService) {
    this.jwksUrl = this.resolveJwksUrl();
    this.jwks = createRemoteJWKSet(this.jwksUrl);
    this.algorithms = this.resolveAlgorithms();
  }

  /**
   * Kiểm tra bearer token và gắn thông tin user đã chuẩn hóa vào request.
   *
   * @param context - Execution context của request hiện tại.
   * @returns `true` nếu token hợp lệ.
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const rawAuthorization = request.headers.authorization;
    if (!rawAuthorization) {
      throw new UnauthorizedException('Missing Authorization header');
    }

    const [scheme, token] = rawAuthorization.trim().split(/\s+/, 2);
    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid bearer token format');
    }

    let payload: JWTPayload;
    try {
      // Verify chữ ký + hạn token dựa trên JWKS của Better Auth.
      const verified = await jwtVerify(token, this.jwks, {
        algorithms: this.algorithms,
      });
      payload = verified.payload;
    } catch (error: unknown) {
      if (error instanceof JoseErrors.JOSEError) {
        throw new UnauthorizedException(`Invalid JWT: ${error.message}`);
      }
      throw error;
    }

    const userId = this.resolveUserId(payload as JwtLikePayload);

    request.user = {
      ...payload,
      id: userId,
    };

    return true;
  }

  /**
   * Xác định URL JWKS của Better Auth từ cấu hình môi trường.
   *
   * @returns URL trỏ tới JWKS endpoint.
   */
  private resolveJwksUrl(): URL {
    const configured = this.configService.get<string>('AUTH_JWKS_URL')?.trim();
    if (configured) {
      return new URL(configured);
    }

    const baseUrl =
      this.configService.get<string>('BETTER_AUTH_BASE_URL')?.trim() ||
      'http://localhost:3000/api/auth';

    return new URL(`${baseUrl.replace(/\/+$/, '')}/jwks`);
  }

  /**
   * Xác định danh sách thuật toán JWT được chấp nhận từ biến môi trường.
   *
   * @returns Mảng thuật toán không rỗng; mặc định là `EdDSA`.
   */
  private resolveAlgorithms(): string[] {
    const raw = this.configService.get<string>('JWT_AUTH_ALGORITHMS');
    if (!raw) {
      return ['EdDSA'];
    }

    const parsed = raw
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    return parsed.length > 0 ? parsed : ['EdDSA'];
  }

  /**
   * Lấy user id từ các claim phổ biến trong JWT payload.
   *
   * @param payload - JWT payload đã decode và verify.
   * @returns User id đã chuẩn hóa về string.
   */
  private resolveUserId(payload: JwtLikePayload): string {
    if (typeof payload.sub === 'string' && payload.sub.length > 0) {
      return payload.sub;
    }
    if (typeof payload.userId === 'string' && payload.userId.length > 0) {
      return payload.userId;
    }
    if (typeof payload.id === 'string' && payload.id.length > 0) {
      return payload.id;
    }

    throw new UnauthorizedException(
      'JWT payload does not include user identifier',
    );
  }

}
