import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class GetManyBaseResponseDto<T> {
  @ApiProperty({ isArray: true, type: () => Object })
  @IsArray()
  data: T[];
  @ApiProperty({ type: Number })
  total: number;
  @ApiProperty({ type: Number })
  page: number;
  @ApiProperty({ type: Number })
  limit: number;
  @ApiProperty({ type: Boolean })
  hasNextPage?: boolean;
  @ApiProperty({ type: Number })
  pageCount: number;
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class GetManyBaseQueryParams {
  @IsOptional()
  @ApiProperty({ required: false })
  @IsString()
  search?: string = '';

  @IsOptional()
  @ApiProperty({ required: false, example: 1 })
  @IsNumber()
  @Transform(({ value }) => Number(value))
  @Min(1)
  page: number = 1;

  @ApiProperty({ required: false, example: 10 })
  @Min(1)
  @Max(100)
  @IsNumber()
  @Transform(({ value }) => Number(value))
  @IsOptional()
  limit: number = 10;

  @ApiProperty({ required: false, example: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy: string = 'createdAt';

  @ApiProperty({
    required: false,
    enum: SortOrder,
    enumName: 'SortOrder',
    example: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder = SortOrder.ASC;
}

export class GetManyWithStatusQueryParams extends GetManyBaseQueryParams {
  @IsOptional()
  @ApiProperty({ required: false })
  @IsString()
  status?: string;
}

export class CursorPaginationResponseMetaDto {
  @ApiProperty()
  hasMoreOlder: boolean;

  @ApiProperty()
  hasMoreNewer: boolean;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  count: number;
}

export class CursorPaginationResponseDto<T> {
  @ApiProperty({ isArray: true, type: () => Object })
  @IsArray()
  data: T[];

  @ApiProperty({ type: () => CursorPaginationResponseMetaDto })
  meta: CursorPaginationResponseMetaDto;
}

export class CursorPaginationQueryParams {
  @ApiProperty({ required: false, example: 50 })
  @Min(1)
  @Max(100)
  @IsNumber()
  @Transform(({ value }) => Number(value))
  @IsOptional()
  limit: number = 50;

  @ApiProperty({ required: false, description: 'Get messages older than this ID' })
  @IsUUID()
  @IsOptional()
  beforeMessageId?: string;

  @ApiProperty({ required: false, description: 'Get messages newer than this ID' })
  @IsUUID()
  @IsOptional()
  afterMessageId?: string;
}

