import { Global, Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { pinoHttpOptions } from './pino-logger.config';
import { LoggerService } from './logger.service';

@Global()
@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: pinoHttpOptions,
      useExisting: true,
    }),
  ],
  providers: [
    {
      provide: LoggerService,
      useValue: new LoggerService(),
    },
  ],
  exports: [LoggerService],
})
export class LoggerModule {}
