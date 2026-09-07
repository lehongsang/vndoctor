import { registerAs } from '@nestjs/config';

export interface DatabaseConfig {
  host: string;
  username: string;
  password: string;
  port: number;
  database: string;
  ssl: boolean;
  synchronize: boolean;
  timezone: string;
  migrationsRun: boolean;
}

export default registerAs(
  'database',
  (): DatabaseConfig => ({
    host: process.env.POSTGRES_HOST || 'localhost',
    username: process.env.POSTGRES_USERNAME || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    database: process.env.POSTGRES_DB || 'vndoctor',
    ssl: process.env.POSTGRES_SSL === 'true',
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
    timezone: process.env.DB_TIMEZONE || process.env.TZ || 'Asia/Ho_Chi_Minh',
    // Migrations are opt-in so an application restart never changes the schema implicitly.
    migrationsRun: process.env.DB_MIGRATIONS_RUN === 'true',
  }),
);
