import {
  CursorPaginationResponseDto,
} from '@/commons/dtos/get-many-base.dto';
import { Type } from '@nestjs/common';
import { ApiExtraModels, ApiProperty } from '@nestjs/swagger';

export function getCursorPaginationResponse<T>({
  data,
  hasMoreOlder,
  hasMoreNewer,
  limit,
  count,
}: {
  data: T[];
  hasMoreOlder: boolean;
  hasMoreNewer: boolean;
  limit: number;
  count: number;
}): CursorPaginationResponseDto<T> {
  return {
    data,
    meta: {
      hasMoreOlder,
      hasMoreNewer,
      limit,
      count,
    },
  };
}

export function GetCursorPaginationResponseDto<T>(model: Type<T>) {
  class PaginatedDto extends CursorPaginationResponseDto<T> {
    @ApiProperty({ isArray: true, type: () => model })
    declare data: T[];
  }

  Object.defineProperty(PaginatedDto, 'name', {
    value: `GetCursorPagination${model.name}Dto`,
  });

  ApiExtraModels(model)(PaginatedDto);
  ApiExtraModels(PaginatedDto);

  return PaginatedDto;
}
