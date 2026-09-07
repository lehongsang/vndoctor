import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { Observable, map } from 'rxjs';

dayjs.extend(utc);
dayjs.extend(timezone);

const DATE_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss.SSS';

/**
 * Serializes response Date values with the configured application timezone.
 */
@Injectable()
export class TimezoneResponseInterceptor implements NestInterceptor {
  /**
   * Creates an interceptor for serializing Date values in API responses.
   *
   * @param responseTimezone IANA timezone used for response date formatting.
   */
  constructor(private readonly responseTimezone: string) {}

  /**
   * Converts outgoing Date values to timezone-aware display strings.
   *
   * @param context Nest execution context for the current request.
   * @param next Downstream call handler.
   * @returns Observable response stream with serialized Date fields.
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next
      .handle()
      .pipe(map((data: unknown) => this.serializeDates(data, new WeakSet())));
  }

  /**
   * Recursively serializes Date values in arrays and plain objects.
   *
   * @param value Response value to serialize.
   * @param seen Objects already visited while walking the response tree.
   * @returns Response value with Date instances formatted as strings.
   */
  private serializeDates(value: unknown, seen: WeakSet<object>): unknown {
    if (value instanceof Date) {
      return dayjs(value).tz(this.responseTimezone).format(DATE_TIME_FORMAT);
    }

    if (Array.isArray(value)) {
      if (seen.has(value)) {
        return value;
      }

      seen.add(value);
      return value.map((item) => this.serializeDates(item, seen));
    }

    if (this.isSerializableObject(value)) {
      if (seen.has(value)) {
        return value;
      }

      seen.add(value);
      return this.cloneWithSerializedDates(value, seen);
    }

    return value;
  }

  /**
   * Clones a response object while preserving its prototype.
   *
   * @param value Response object to clone.
   * @param seen Objects already visited while walking the response tree.
   * @returns Cloned object with Date fields serialized.
   */
  private cloneWithSerializedDates(
    value: Record<string, unknown>,
    seen: WeakSet<object>,
  ): Record<string, unknown> {
    const clone = Object.create(Object.getPrototypeOf(value)) as Record<
      string,
      unknown
    >;

    Object.keys(value).forEach((key) => {
      clone[key] = this.serializeDates(value[key], seen);
    });

    return clone;
  }

  /**
   * Checks whether a value is a response object that is safe to clone.
   *
   * @param value Value to inspect.
   * @returns True when the value is safe to traverse as response data.
   */
  private isSerializableObject(value: unknown): value is Record<string, unknown> {
    if (value === null || typeof value !== 'object') {
      return false;
    }

    if (
      Buffer.isBuffer(value) ||
      value instanceof Uint8Array ||
      value instanceof Error
    ) {
      return false;
    }

    const maybeStream = value as { pipe?: unknown };
    return typeof maybeStream.pipe !== 'function';
  }
}
