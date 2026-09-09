import { registerAs } from '@nestjs/config';

export interface DatabaseConfig {
  host: string;
  username: string;
  password: string;
  port: number;
  database: string;
  ssl: boolean | { rejectUnauthorized: boolean };
  synchronize: boolean;
  timezone: string;
  migrationsRun: boolean;
}

export function parseDatabaseEnv(): {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl: boolean | { rejectUnauthorized: boolean };
} {
  const rawUrl =
    process.env.DATABASE_URL ||
    process.env.INTERNAL_DATABASE_URL ||
    process.env.POSTGRES_URL;

  let host = process.env.POSTGRES_HOST || 'localhost';
  let port = parseInt(process.env.POSTGRES_PORT || '5432', 10);
  let username = process.env.POSTGRES_USERNAME || 'postgres';
  let password = process.env.POSTGRES_PASSWORD || 'postgres';
  let database = process.env.POSTGRES_DB || 'vndoctor';

  if (rawUrl) {
    try {
      const parsed = new URL(rawUrl);
      host = parsed.hostname || host;
      port = parsed.port ? parseInt(parsed.port, 10) : 5432;
      username = parsed.username
        ? decodeURIComponent(parsed.username)
        : username;
      password = parsed.password
        ? decodeURIComponent(parsed.password)
        : password;
      const cleanPath = parsed.pathname.replace(/^\//, '');
      if (cleanPath) {
        database = decodeURIComponent(cleanPath);
      }
    } catch {
      // Ignore URL parse error and fallback to separate env vars
    }
  }

  // Handle accidental inclusion of port or protocol in POSTGRES_HOST
  if (host.includes('://')) {
    try {
      const parsed = new URL(host);
      host = parsed.hostname;
      if (parsed.port) port = parseInt(parsed.port, 10);
    } catch {
      host = host.replace(/^[a-zA-Z]+:\/\//, '');
    }
  }
  if (host.includes(':')) {
    const parts = host.split(':');
    host = parts[0];
    if (parts[1] && !isNaN(Number(parts[1]))) {
      port = parseInt(parts[1], 10);
    }
  }

  const isCloudHost =
    host.includes('render.com') ||
    host.includes('neon.tech') ||
    host.includes('supabase.co') ||
    host.includes('amazonaws.com') ||
    host.includes('azure.com');

  const requireSsl =
    process.env.POSTGRES_SSL === 'true' ||
    (rawUrl && rawUrl.includes('sslmode=require')) ||
    isCloudHost;

  const ssl = requireSsl ? { rejectUnauthorized: false } : false;

  return { host, port, username, password, database, ssl };
}

export default registerAs(
  'database',
  (): DatabaseConfig => {
    const parsed = parseDatabaseEnv();
    return {
      host: parsed.host,
      username: parsed.username,
      password: parsed.password,
      port: parsed.port,
      database: parsed.database,
      ssl: parsed.ssl,
      synchronize: process.env.DB_SYNCHRONIZE === 'true',
      timezone: process.env.DB_TIMEZONE || process.env.TZ || 'Asia/Ho_Chi_Minh',
      migrationsRun: process.env.DB_MIGRATIONS_RUN === 'true',
    };
  },
);
