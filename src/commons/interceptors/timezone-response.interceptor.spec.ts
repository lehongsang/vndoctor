import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { firstValueFrom, of } from 'rxjs';
import { TimezoneResponseInterceptor } from './timezone-response.interceptor';

class EntityLikeResponse {
  createdAt = new Date('2026-05-15T03:03:54.004Z');
}

class CircularEntityLikeResponse {
  createdAt = new Date('2026-05-15T03:03:54.004Z');

  self?: CircularEntityLikeResponse;
}

describe('TimezoneResponseInterceptor', () => {
  it('serializes Date values inside entity-like class instances', async () => {
    const interceptor = new TimezoneResponseInterceptor('Asia/Ho_Chi_Minh');
    const next: CallHandler = {
      handle: () => of(new EntityLikeResponse()),
    };

    const result = (await firstValueFrom(
      interceptor.intercept({} as ExecutionContext, next),
    )) as { createdAt: string };

    expect(result.createdAt).toBe('2026-05-15 10:03:54.004');
    expect(result).toBeInstanceOf(EntityLikeResponse);
  });

  it('does not recurse forever on circular response references', async () => {
    const interceptor = new TimezoneResponseInterceptor('Asia/Ho_Chi_Minh');
    const response = new CircularEntityLikeResponse();
    response.self = response;
    const next: CallHandler = {
      handle: () => of(response),
    };

    const result = (await firstValueFrom(
      interceptor.intercept({} as ExecutionContext, next),
    )) as CircularEntityLikeResponse;

    expect(result.createdAt).toBe('2026-05-15 10:03:54.004');
    expect(result.self).toBe(response);
  });
});
