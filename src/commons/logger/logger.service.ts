import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import { generateId } from '../../utils/nanoid-generators';
import { appPinoLogger } from './pino-logger.config';

type LogMetadata = Record<string, unknown>;
type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

/**
 * Backward-compatible application logger backed by Pino.
 */
@Injectable()
export class LoggerService implements NestLoggerService {
  private context?: string;

  /**
   * Creates a logger facade for existing application code.
   *
   * @param context Optional log context name.
   */
  constructor(context?: string) {
    this.context = context;
  }

  /**
   * Overrides the context shown in emitted log records.
   *
   * @param context Context name.
   */
  setContext(context: string): void {
    this.context = context;
  }

  /**
   * Emits an info-level log.
   *
   * @param message Log message or object.
   * @param metadata Optional structured metadata.
   * @param correlationId Optional request correlation ID.
   */
  log(
    message: unknown,
    metadata?: LogMetadata | null,
    correlationId?: string | null,
  ): void {
    this.emit('info', message, metadata, correlationId);
  }

  /**
   * Emits an error-level log.
   *
   * @param message Log message or object.
   * @param stackOrMetadata Stack string, Error instance, or structured metadata.
   * @param correlationId Optional request correlation ID.
   * @param stack Optional stack string when metadata is provided.
   */
  error(
    message: unknown,
    stackOrMetadata?: string | Error | LogMetadata | null,
    correlationId?: string | null,
    stack?: string,
  ): void {
    let metadata: LogMetadata | undefined;
    let trace: string | undefined;

    if (typeof stackOrMetadata === 'string') {
      trace = stackOrMetadata;
    } else if (stackOrMetadata instanceof Error) {
      trace = stackOrMetadata.stack;
      metadata = {
        errMessage: stackOrMetadata.message,
        errName: stackOrMetadata.name,
      };
    } else if (stackOrMetadata) {
      metadata = stackOrMetadata;
      trace = stack;
    } else {
      trace = stack;
    }

    this.emit('error', message, metadata, correlationId, trace);
  }

  /**
   * Emits a warn-level log.
   *
   * @param message Log message or object.
   * @param metadata Optional structured metadata.
   * @param correlationId Optional request correlation ID.
   */
  warn(
    message: unknown,
    metadata?: LogMetadata | null,
    correlationId?: string | null,
  ): void {
    this.emit('warn', message, metadata, correlationId);
  }

  /**
   * Emits a debug-level log.
   *
   * @param message Log message or object.
   * @param metadata Optional structured metadata.
   * @param correlationId Optional request correlation ID.
   */
  debug(
    message: unknown,
    metadata?: LogMetadata | null,
    correlationId?: string | null,
  ): void {
    this.emit('debug', message, metadata, correlationId);
  }

  /**
   * Emits a verbose-level log using Pino trace.
   *
   * @param message Log message or object.
   * @param metadata Optional structured metadata.
   * @param correlationId Optional request correlation ID.
   */
  verbose(
    message: unknown,
    metadata?: LogMetadata | null,
    correlationId?: string | null,
  ): void {
    this.emit('trace', message, metadata, correlationId);
  }

  /**
   * Preserves old console-only API while using the shared Pino logger.
   *
   * @param message Log message or object.
   * @param metadata Optional structured metadata.
   * @param correlationId Optional request correlation ID.
   */
  logConsoleOnly(
    message: unknown,
    metadata?: LogMetadata | null,
    correlationId?: string | null,
  ): void {
    this.log(message, metadata, correlationId);
  }

  /**
   * Preserves old console-only API while using the shared Pino logger.
   *
   * @param message Log message or object.
   * @param metadata Optional structured metadata.
   * @param correlationId Optional request correlation ID.
   */
  errorConsoleOnly(
    message: unknown,
    metadata?: Error | LogMetadata | null,
    correlationId?: string | null,
  ): void {
    this.error(message, metadata, correlationId);
  }

  /**
   * Preserves old console-only API while using the shared Pino logger.
   *
   * @param message Log message or object.
   * @param metadata Optional structured metadata.
   * @param correlationId Optional request correlation ID.
   */
  warnConsoleOnly(
    message: unknown,
    metadata?: LogMetadata | null,
    correlationId?: string | null,
  ): void {
    this.warn(message, metadata, correlationId);
  }

  /**
   * Emits a normalized Pino log record.
   *
   * @param level Pino level.
   * @param message Log message or object.
   * @param metadata Optional structured metadata.
   * @param correlationId Optional request correlation ID.
   * @param trace Optional stack trace.
   */
  private emit(
    level: LogLevel,
    message: unknown,
    metadata?: LogMetadata | null,
    correlationId?: string | null,
    trace?: string,
  ): void {
    const payload: LogMetadata = {
      context: this.context ?? 'App',
      ...(level === 'error' ? { id: generateId() } : {}),
      ...(metadata ?? {}),
      ...(trace ? { trace } : {}),
      ...(correlationId ? { correlationId } : {}),
    };

    appPinoLogger[level](payload, this.formatMessage(message));
  }

  /**
   * Converts arbitrary messages into Pino message strings.
   *
   * @param message Log message or object.
   * @returns Safe message string.
   */
  private formatMessage(message: unknown): string {
    if (message instanceof Error) {
      return message.message;
    }
    if (typeof message === 'string') {
      return message;
    }
    if (typeof message === 'object' && message !== null) {
      return this.safeStringify(message);
    }

    return String(message);
  }

  /**
   * Safely serializes object messages.
   *
   * @param value Object-like message.
   * @returns JSON string or fallback label.
   */
  private safeStringify(value: unknown): string {
    try {
      return JSON.stringify(value) ?? String(value);
    } catch {
      return '[Circular or Non-Serializable Object]';
    }
  }
}
