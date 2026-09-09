import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { join } from 'path';
import { parseDatabaseEnv } from './database.config';

config({ path: join(__dirname, '../../.env') });

const parsed = parseDatabaseEnv();

/**
 * Data source for the TypeORM CLI (`migration:run`, `migration:generate`, …).
 * Connection options must stay aligned with {@link DatabaseModule} and `database.config.ts`.
 */
export default new DataSource({
  type: 'postgres',
  host: parsed.host,
  port: parsed.port,
  username: parsed.username,
  password: parsed.password,
  database: parsed.database,
  ssl: parsed.ssl,
  extra: {
    options: `-c timezone=${process.env.DB_TIMEZONE || process.env.TZ || 'Asia/Ho_Chi_Minh'}`,
  },
  entities: [__dirname + '/../**/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
});
