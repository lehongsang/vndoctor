import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseService } from './database.service';
import { ConfigService } from '@nestjs/config';
import { DatabaseConfig } from './database.config';

import { Pool } from 'pg';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const dbConfig = configService.get<DatabaseConfig>('database');
        if (!dbConfig) {
          throw new Error('Database configuration is missing');
        }
        return {
          type: 'postgres',
          host: dbConfig.host,
          port: dbConfig.port,
          username: dbConfig.username,
          password: dbConfig.password,
          database: dbConfig.database,
          ssl: dbConfig.ssl,
          entities: [__dirname + '/../**/**/*.entity{.ts,.js}'],
          migrations: [__dirname + '/migrations/*{.ts,.js}'],
          migrationsRun: dbConfig.migrationsRun,
          synchronize: dbConfig.synchronize,
          extra: {
            options: `-c timezone=${dbConfig.timezone}`,
          },
        };
      },
    }),
  ],
  providers: [
    DatabaseService,
    {
      provide: 'PG_POOL',
      inject: [ConfigService],
      useFactory: (configService: ConfigService): Pool => {
        const dbConfig = configService.get<DatabaseConfig>('database');
        if (!dbConfig) {
          throw new Error('Database configuration is missing');
        }
        return new Pool({
          host: dbConfig.host,
          port: dbConfig.port,
          user: dbConfig.username,
          password: dbConfig.password,
          database: dbConfig.database,
          ssl: dbConfig.ssl,
          options: `-c timezone=${dbConfig.timezone}`,
        });
      },
    },
  ],
  exports: [DatabaseService, 'PG_POOL'],
})
export class DatabaseModule {}
