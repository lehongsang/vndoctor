import type { GetManyBaseQueryParams } from '@/commons/dtos/get-many-base.dto';

export interface PaginationOptions {
  skip: number;
  take: number;
}

/**
 * Converts page/limit query params into TypeORM pagination options.
 *
 * @param query - Normalized pagination query params.
 * @returns Offset-based pagination options for repository queries.
 */
export function getPaginationOptions(
  query: Pick<GetManyBaseQueryParams, 'page' | 'limit'>,
): PaginationOptions {
  return {
    skip: (query.page - 1) * query.limit,
    take: query.limit,
  };
}
