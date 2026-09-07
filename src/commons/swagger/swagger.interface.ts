import type { HttpStatus } from '@nestjs/common';
import type { ApiParamOptions, ApiQueryOptions } from '@nestjs/swagger';
import type { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import type { ClassConstructor } from 'class-transformer';

export interface ISwaggerResponseOptions<T> {
  dataSchema?: SchemaObject;
  description?: string;
  extraModels?: ClassConstructor<T>[];
  httpStatus?: HttpStatus;
  messageExample?: string;
  serialization?: ClassConstructor<T>;
  isArray?: boolean;
}

export interface ISwaggerErrorOptions {
  status: HttpStatus;
  message?: string;
  errorCode?: string | number;
}

export interface ISwaggerOptions<T> {
  description?: string;
  response?: ISwaggerResponseOptions<T>;
  request?: ISwaggerRequestOptions;
  errors?: ISwaggerErrorOptions[];
  summary?: string;
  operationId?: string;
}

interface ISwaggerRequestOptions {
  params?: ApiParamOptions[];
  queries?: ApiQueryOptions[];
  bodyType?: 'FORM_DATA' | 'JSON';
}
