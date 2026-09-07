import 'reflect-metadata';
import { config } from 'dotenv';
import { DataSource } from 'typeorm';
import { join } from 'path';

config({ path: join(__dirname, '../../.env') });

/**
 * Data source for the TypeORM CLI (`migration:run`, `migration:generate`, …).
 * Connection options must stay aligned with {@link DatabaseModule} and `database.config.ts`.
 */
export default new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  username: process.env.POSTGRES_USERNAME || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'vndoctor',
  ssl: process.env.POSTGRES_SSL === 'true',
  extra: {
    options: `-c timezone=${process.env.DB_TIMEZONE || process.env.TZ || 'Asia/Ho_Chi_Minh'}`,
  },
  entities: [__dirname + '/../**/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
});
