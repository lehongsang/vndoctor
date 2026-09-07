import { applyDecorators, HttpStatus, SetMetadata } from '@nestjs/common';
import {
  ApiConsumes,
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiQuery,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import type { ExampleObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';

import { ErrorResponseDto } from '../dtos/error-response.dto';
import type {
  ISwaggerErrorOptions,
  ISwaggerOptions,
  ISwaggerResponseOptions,
} from './swagger.interface';
import { AppResponseSerialization } from './response.serialization';
import { FILE_UPLOAD_METADATA_KEY } from '../decorators/file-upload.decorator';

export const RESPONSE_SWAGGER_METADATA = 'RESPONSE_SWAGGER_METADATA';

/**
 * Applies shared Swagger decorators (consumes/produces/default success response).
 *
 * @param options - Swagger documentation options.
 * @returns Method decorators to merge via `applyDecorators`.
 */
function applyCommonDecorators<T>(
  options?: ISwaggerOptions<T>,
): MethodDecorator[] {
  const decorators: MethodDecorator[] = [];
  decorators.push(ApiConsumes(getContentType(options?.request?.bodyType)));
  decorators.push(ApiProduces('application/json'));
  decorators.push(swaggerDefaultResponse(options?.response || {}));

  return decorators;
}

/**
 * Applies Swagger decorators for path params and query strings.
 *
 * @param options - Swagger documentation options.
 * @returns Method decorators to merge via `applyDecorators`.
 */
function applyParamDecorators<T>(
  options?: ISwaggerOptions<T>,
): MethodDecorator[] {
  const decorators: MethodDecorator[] = [];

  if (options?.request?.params?.length) {
    decorators.push(...options.request.params.map(ApiParam));
  }

  if (options?.request?.queries?.length) {
    decorators.push(...options.request.queries.map(ApiQuery));
  }

  return decorators;
}

/**
 * Applies `ApiOperation` when summary/description/operationId are provided.
 *
 * @param options - Swagger documentation options.
 * @returns Method decorators to merge via `applyDecorators`.
 */
function applyOperationDecorators<T>(
  options?: ISwaggerOptions<T>,
): MethodDecorator[] {
  const decorators: MethodDecorator[] = [];

  if (options?.description || options?.summary || options?.operationId) {
    decorators.push(
      ApiOperation({
        description: options.description,
        summary: options.summary,
        operationId: options.operationId,
      }),
    );
  }

  return decorators;
}

/**
 * Composes NestJS Swagger decorators for a controller method.
 *
 * @param options - Summary, request shape, success response schema, and error examples.
 * @returns A method decorator.
 */
export function Swagger<T>(options?: ISwaggerOptions<T>): MethodDecorator {
  return (
    target: object,
    propertyKey: string | symbol,
    descriptor: TypedPropertyDescriptor<unknown>,
  ) => {
    const isFileUpload = Reflect.getMetadata(
      FILE_UPLOAD_METADATA_KEY,
      descriptor.value as object,
    ) as boolean | undefined;

    const effectiveOptions = { ...options };
    if (isFileUpload && !effectiveOptions.request?.bodyType) {
      if (!effectiveOptions.request) {
        effectiveOptions.request = {};
      }
      effectiveOptions.request.bodyType = 'FORM_DATA';
    }

    const decorators: MethodDecorator[] = [];

    decorators.push(ApiExtraModels(ErrorResponseDto));

    decorators.push(...applyCommonDecorators(effectiveOptions));

    decorators.push(...applyParamDecorators(effectiveOptions));

    decorators.push(...applyErrorDecorators(effectiveOptions?.errors));

    decorators.push(...applyOperationDecorators(effectiveOptions));

    decorators.push(SetMetadata(RESPONSE_SWAGGER_METADATA, true));

    return applyDecorators(...decorators)(target, propertyKey, descriptor);
  };
}

/**
 * Maps body type to `ApiConsumes` content type.
 *
 * @param bodyType - JSON or multipart upload.
 * @returns MIME type string.
 */
function getContentType(bodyType?: 'FORM_DATA' | 'JSON'): string {
  return bodyType === 'FORM_DATA' ? 'multipart/form-data' : 'application/json';
}

/**
 * Builds the default `ApiResponse` for HTTP 200 (or configured status).
 *
 * @param options - Response schema / serialization class.
 * @returns Method decorator wrapping `ApiResponse`.
 */
function swaggerDefaultResponse<T>({
  dataSchema,
  description,
  extraModels = [],
  isArray = false,
  httpStatus = HttpStatus.OK,
  serialization,
}: Omit<ISwaggerResponseOptions<T>, 'messageExample'>): MethodDecorator {
  const decorators: MethodDecorator[] = [];

  const schema: Record<string, unknown> = {
    allOf: [{ $ref: getSchemaPath(AppResponseSerialization<T>) }],
  };

  if (dataSchema) {
    Object.assign(schema, dataSchema);
  } else if (serialization) {
    decorators.push(ApiExtraModels(serialization));
    if (isArray) {
      Object.assign(schema, {
        properties: {
          data: {
            type: 'array',
            items: { $ref: getSchemaPath(serialization) },
          },
        },
      });
    } else {
      Object.assign(schema, {
        $ref: getSchemaPath(serialization),
      });
    }
  }

  decorators.push(ApiExtraModels(AppResponseSerialization<T>));
  extraModels.forEach((model) => {
    if (model) {
      decorators.push(ApiExtraModels(model));
    }
  });

  decorators.push(
    ApiResponse({
      description,
      status: httpStatus,
      schema,
    }),
  );

  return applyDecorators(...decorators);
}

/**
 * Groups documented errors by HTTP status and attaches example payloads.
 *
 * @param errors - List of error statuses/messages for Swagger.
 * @returns Method decorators, one per distinct status code.
 */
function applyErrorDecorators(
  errors?: ISwaggerErrorOptions[],
): MethodDecorator[] {
  if (!errors || errors.length === 0) return [];

  const groupedByStatus = errors.reduce(
    (acc, curr) => {
      const status = curr.status as number;
      if (!acc[status]) {
        acc[status] = [];
      }
      acc[status].push(curr);
      return acc;
    },
    {} as Record<number, ISwaggerErrorOptions[]>,
  );

  return Object.entries(groupedByStatus).map(([status, errorGroup]) => {
    const examples: Record<string, ExampleObject> = {};

    errorGroup.forEach((error, index) => {
      const key = error.errorCode ? String(error.errorCode) : `error_${index}`;
      examples[key] = {
        summary: error.message || `Error code: ${error.errorCode}`,
        value: {
          statusCode: Number.parseInt(status, 10),
          message: error.message || 'Error occurred',
          code: error.errorCode,
        },
      };
    });

    return ApiResponse({
      status: Number.parseInt(status, 10),
      description: errorGroup.map((e) => e.message).join(' / '),
      content: {
        'application/json': {
          schema: { $ref: getSchemaPath(ErrorResponseDto) },
          examples,
        },
      },
    });
  });
}
