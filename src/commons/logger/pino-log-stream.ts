import * as fs from 'fs';
import * as path from 'path';
import dayjs from 'dayjs';
import type pino from 'pino';

interface PinoLogRecord {
  level?: number;
  time?: string | number;
  context?: string;
  correlationId?: string;
  id?: string;
  message?: string;
  msg?: string;
  trace?: string;
  err?: {
    stack?: string;
    message?: string;
  };
  [key: string]: unknown;
}

/**
 * Pino destination stream that writes readable console lines and split daily files.
 */
export class PinoLogStream implements pino.DestinationStream {
  private readonly retentionDays = this.resolvePositiveIntegerEnv(
    'LOG_FILE_RETENTION_DAYS',
    14,
  );
  private readonly maxFileSizeBytes =
    this.resolvePositiveIntegerEnv('LOG_FILE_MAX_SIZE_MB', 50) * 1024 * 1024;
  private currentDateKey = '';
  private currentMonthDirectory = '';
  private nextRotationTime = 0;
  private outStream?: fs.WriteStream;
  private errStream?: fs.WriteStream;
  private outBytes = 0;
  private errBytes = 0;
  private outFilePath = '';
  private errFilePath = '';

  /**
   * Accepts JSON lines emitted by Pino and routes them to console and log files.
   *
   * @param message Raw JSON log line from Pino.
   */
  write(message: string): void {
    const record = this.parseRecord(message);
    const line = this.formatRecord(record);

    this.writeConsole(line);

    if (process.env.NODE_ENV === 'test') {
      return;
    }

    this.writeFile(record.level ?? 30, line);
  }

  /**
   * Parses a Pino JSON line without throwing into the logging pipeline.
   *
   * @param message Raw JSON log line.
   * @returns Parsed record or a fallback record.
   */
  private parseRecord(message: string): PinoLogRecord {
    try {
      return JSON.parse(message) as PinoLogRecord;
    } catch {
      return {
        level: 30,
        time: new Date().toISOString(),
        message: message.trim(),
      };
    }
  }

  /**
   * Formats a Pino record into a compact operational log line.
   *
   * @param record Parsed Pino log record.
   * @returns Human-readable log line.
   */
  private formatRecord(record: PinoLogRecord): string {
    const timestamp = this.formatTimestamp(record.time);
    const level = this.formatLevel(record.level);
    const context = record.context ? ` [${record.context}]` : '';
    const correlationId = record.correlationId
      ? ` correlationId=${record.correlationId}`
      : '';
    const id = record.id ? ` id=${record.id}` : '';
    const message = record.message ?? record.msg ?? '';
    const metadata = this.formatMetadata(record);
    const stack = record.trace ?? record.err?.stack;
    const base = `${timestamp} ${level}${context}${correlationId}${id} ${message}${metadata}`;

    return stack ? `${base}\n${stack}` : base;
  }

  /**
   * Converts Pino's timestamp into the project's readable timestamp format.
   *
   * @param value Pino timestamp value.
   * @returns Formatted timestamp.
   */
  private formatTimestamp(value: string | number | undefined): string {
    if (typeof value === 'number') {
      return dayjs(value).format('YYYY-MM-DD HH:mm:ss.SSS');
    }
    if (typeof value === 'string') {
      return dayjs(value).isValid()
        ? dayjs(value).format('YYYY-MM-DD HH:mm:ss.SSS')
        : value;
    }
    return dayjs().format('YYYY-MM-DD HH:mm:ss.SSS');
  }

  /**
   * Maps Pino numeric levels to standard labels.
   *
   * @param level Pino numeric level.
   * @returns Log level label.
   */
  private formatLevel(level: number | undefined): string {
    if (level === undefined) {
      return 'INFO';
    }

    if (level >= 60) return 'FATAL';
    if (level >= 50) return 'ERROR';
    if (level >= 40) return 'WARN';
    if (level >= 30) return 'INFO';
    if (level >= 20) return 'DEBUG';
    return 'TRACE';
  }

  /**
   * Serializes non-core Pino fields into key=value metadata.
   *
   * @param record Parsed Pino log record.
   * @returns Metadata suffix for the log line.
   */
  private formatMetadata(record: PinoLogRecord): string {
    const skippedKeys = new Set([
      'level',
      'time',
      'pid',
      'hostname',
      'context',
      'correlationId',
      'id',
      'message',
      'msg',
      'trace',
      'err',
      'req',
      'res',
      'request',
      'response',
    ]);
    const entries = Object.entries(record).filter(
      ([key]) => !skippedKeys.has(key),
    );

    if (!entries.length) {
      return '';
    }

    return ` ${entries
      .map(([key, value]) => `${key}=${this.formatMetadataValue(value)}`)
      .join(' ')}`;
  }

  /**
   * Formats one metadata value for key=value log output.
   *
   * @param value Metadata value.
   * @returns Safe metadata string.
   */
  private formatMetadataValue(value: unknown): string {
    if (value === null || value === undefined) {
      return 'null';
    }
    if (typeof value === 'string') {
      return value.includes(' ') || value.includes('"')
        ? JSON.stringify(value)
        : value;
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    return this.safeStringify(value);
  }

  /**
   * Safely stringifies metadata values.
   *
   * @param value Metadata value.
   * @returns JSON string or fallback label.
   */
  private safeStringify(value: unknown): string {
    try {
      const json = JSON.stringify(value) ?? String(value);

      return json.includes(' ') || json.includes('"')
        ? JSON.stringify(json)
        : json;
    } catch {
      return '[Circular or Non-Serializable Object]';
    }
  }

  /**
   * Writes a line to process stdout or stderr according to severity.
   *
   * @param line Formatted log line.
   */
  private writeConsole(line: string): void {
    process.stdout.write(`${line}\n`);
  }

  /**
   * Writes a line to the daily out or error file.
   *
   * @param level Pino numeric level.
   * @param line Formatted log line.
   */
  private writeFile(level: number, line: string): void {
    try {
      const content = `${line}\n`;
      const byteLength = Buffer.byteLength(content);
      const streamKind = level >= 50 ? 'err' : 'out';
      const stream = this.getWritableStream(streamKind, byteLength);

      stream.write(content);
      this.trackWrittenBytes(streamKind, byteLength);
    } catch (error) {
      process.stderr.write(
        `[PinoLogStream] Failed to write log file: ${this.formatError(error)}\n`,
      );
    }
  }

  /**
   * Lazily opens log streams and rotates them when the date changes.
   *
   * @returns Current out and error write streams.
   */
  private getStreams(): {
    outStream: fs.WriteStream;
    errStream: fs.WriteStream;
  } {
    const now = Date.now();

    if (
      now < this.nextRotationTime &&
      this.outStream &&
      this.errStream
    ) {
      return {
        outStream: this.outStream,
        errStream: this.errStream,
      };
    }

    this.closeStreams();

    const date = dayjs(now);
    const dateKey = date.format('YYYY-MM-DD');
    this.currentDateKey = dateKey;
    this.nextRotationTime = date.add(1, 'day').startOf('day').valueOf();

    const monthDirectory = path.join(
      process.cwd(),
      'logs',
      date.format('YYYY-MM'),
    );
    fs.mkdirSync(monthDirectory, { recursive: true });

    this.currentMonthDirectory = monthDirectory;
    this.openDailyStreams(monthDirectory, dateKey);
    this.cleanupExpiredFiles();

    if (!this.outStream || !this.errStream) {
      throw new Error('Failed to open application log streams');
    }

    return {
      outStream: this.outStream,
      errStream: this.errStream,
    };
  }

  /**
   * Opens both daily streams at the first file with available capacity.
   *
   * @param monthDirectory Directory for the current month.
   * @param dateKey Date key used in file names.
   */
  private openDailyStreams(monthDirectory: string, dateKey: string): void {
    const outFile = this.openDailyStream(monthDirectory, dateKey, 'out', 1);
    const errFile = this.openDailyStream(monthDirectory, dateKey, 'err', 1);

    this.outStream = outFile.stream;
    this.errStream = errFile.stream;
    this.outBytes = outFile.bytes;
    this.errBytes = errFile.bytes;
    this.outFilePath = outFile.filePath;
    this.errFilePath = errFile.filePath;
    this.outStream.on('error', (error) => this.logStreamError(error));
    this.errStream.on('error', (error) => this.logStreamError(error));
  }

  /**
   * Opens a daily stream, adding numeric suffixes when the base file is full.
   *
   * @param monthDirectory Directory for the current month.
   * @param dateKey Date key used in file names.
   * @param kind Log file kind.
   * @param incomingBytes Bytes that must fit in the selected file.
   * @param excludedPath Currently open file path to skip during size rotation.
   * @returns Open stream and current file size.
   */
  private openDailyStream(
    monthDirectory: string,
    dateKey: string,
    kind: 'out' | 'err',
    incomingBytes: number,
    excludedPath?: string,
  ): { stream: fs.WriteStream; bytes: number; filePath: string } {
    let sequence = 0;

    while (true) {
      const suffix = sequence === 0 ? '' : `-${sequence}`;
      const filePath = path.join(
        monthDirectory,
        `${dateKey}-${kind}${suffix}.log`,
      );
      const bytes = this.getFileSize(filePath);

      if (
        filePath !== excludedPath &&
        (bytes === 0 ||
          bytes + incomingBytes <= this.maxFileSizeBytes ||
          incomingBytes > this.maxFileSizeBytes)
      ) {
        return {
          stream: fs.createWriteStream(filePath, { flags: 'a' }),
          bytes,
          filePath,
        };
      }

      sequence += 1;
    }
  }

  /**
   * Returns a writable stream, rotating by size before writing when needed.
   *
   * @param kind Log file kind.
   * @param incomingBytes Bytes about to be written.
   * @returns Writable stream with enough capacity when possible.
   */
  private getWritableStream(
    kind: 'out' | 'err',
    incomingBytes: number,
  ): fs.WriteStream {
    const { outStream, errStream } = this.getStreams();
    const stream = kind === 'err' ? errStream : outStream;
    const currentBytes = kind === 'err' ? this.errBytes : this.outBytes;

    if (currentBytes + incomingBytes <= this.maxFileSizeBytes) {
      return stream;
    }

    return this.rotateSizeLimitedStream(kind, incomingBytes);
  }

  /**
   * Rotates one stream when the current file reaches the configured max size.
   *
   * @param kind Log file kind.
   * @param incomingBytes Bytes about to be written.
   * @returns Newly opened writable stream.
   */
  private rotateSizeLimitedStream(
    kind: 'out' | 'err',
    incomingBytes: number,
  ): fs.WriteStream {
    if (kind === 'err') {
      this.errStream?.end();
      const errFile = this.openDailyStream(
        this.currentMonthDirectory,
        this.currentDateKey,
        'err',
        incomingBytes,
        this.errFilePath,
      );
      this.errStream = errFile.stream;
      this.errBytes = errFile.bytes;
      this.errFilePath = errFile.filePath;
      this.errStream.on('error', (error) => this.logStreamError(error));

      return this.errStream;
    }

    this.outStream?.end();
    const outFile = this.openDailyStream(
      this.currentMonthDirectory,
      this.currentDateKey,
      'out',
      incomingBytes,
      this.outFilePath,
    );
    this.outStream = outFile.stream;
    this.outBytes = outFile.bytes;
    this.outFilePath = outFile.filePath;
    this.outStream.on('error', (error) => this.logStreamError(error));

    return this.outStream;
  }

  /**
   * Tracks bytes written to the active stream.
   *
   * @param kind Log file kind.
   * @param byteLength Number of bytes written.
   */
  private trackWrittenBytes(kind: 'out' | 'err', byteLength: number): void {
    if (kind === 'err') {
      this.errBytes += byteLength;

      return;
    }

    this.outBytes += byteLength;
  }

  /**
   * Gets file size or zero when the file does not exist.
   *
   * @param filePath File path to inspect.
   * @returns File size in bytes.
   */
  private getFileSize(filePath: string): number {
    try {
      return fs.statSync(filePath).size;
    } catch {
      return 0;
    }
  }

  /**
   * Closes active file streams during date rotation.
   */
  private closeStreams(): void {
    this.outStream?.end();
    this.errStream?.end();
    this.outStream = undefined;
    this.errStream = undefined;
    this.outBytes = 0;
    this.errBytes = 0;
    this.outFilePath = '';
    this.errFilePath = '';
  }

  /**
   * Removes log files older than the configured retention window.
   */
  private cleanupExpiredFiles(): void {
    try {
      const logsDirectory = path.join(process.cwd(), 'logs');
      const expiresBefore = dayjs().subtract(this.retentionDays, 'day');

      // Traverse monthly directories so retention keeps working across month boundaries.
      this.visitLogFiles(logsDirectory, (filePath) => {
        const dateKey = this.extractDateKey(filePath);

        if (dateKey && dayjs(dateKey).isBefore(expiresBefore, 'day')) {
          try {
            fs.unlinkSync(filePath);
          } catch (error) {
            process.stderr.write(
              `[PinoLogStream] Failed to remove expired log file ${filePath}: ${this.formatError(error)}\n`,
            );
          }
        }
      });
    } catch (error) {
      process.stderr.write(
        `[PinoLogStream] Failed to cleanup expired log files: ${this.formatError(error)}\n`,
      );
    }
  }

  /**
   * Visits log files below the configured logs directory.
   *
   * @param directory Directory to scan.
   * @param visitor Callback invoked for each file.
   */
  private visitLogFiles(
    directory: string,
    visitor: (filePath: string) => void,
  ): void {
    if (!fs.existsSync(directory)) {
      return;
    }

    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        this.visitLogFiles(entryPath, visitor);
      } else if (entry.isFile()) {
        visitor(entryPath);
      }
    }
  }

  /**
   * Extracts the date key from supported log file names.
   *
   * @param filePath Log file path.
   * @returns Date key when the file uses a recognized log naming pattern.
   */
  private extractDateKey(filePath: string): string | null {
    const fileName = path.basename(filePath);
    const logFilePattern =
      /^(?:app-)?(?<date>\d{4}-\d{2}-\d{2})(?:-(?:out|err)(?:-\d+)?)?\.log(?:\.gz)?$|^app-(?<jsonDate>\d{4}-\d{2}-\d{2})\.json(?:\.gz)?$/;
    const match = fileName.match(logFilePattern);

    return match?.groups?.date ?? match?.groups?.jsonDate ?? null;
  }

  /**
   * Reads a positive integer environment variable with a safe fallback.
   *
   * @param key Environment variable name.
   * @param fallback Fallback value.
   * @returns Positive integer value.
   */
  private resolvePositiveIntegerEnv(key: string, fallback: number): number {
    const rawValue = process.env[key];
    const parsedValue = rawValue ? Number.parseInt(rawValue, 10) : fallback;

    return Number.isFinite(parsedValue) && parsedValue > 0
      ? parsedValue
      : fallback;
  }

  /**
   * Writes file stream errors to stderr without throwing into Pino.
   *
   * @param error File stream error.
   */
  private logStreamError(error: Error): void {
    process.stderr.write(
      `[PinoLogStream] File stream error: ${this.formatError(error)}\n`,
    );
  }

  /**
   * Formats unknown errors for fallback stderr logging.
   *
   * @param error Unknown thrown value.
   * @returns Readable error message.
   */
  private formatError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
