import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Pool } from 'pg';

@Injectable()
export class DatabaseService implements OnApplicationShutdown {
  constructor(
    private readonly dataSource: DataSource,
    @Inject('PG_POOL') private readonly pool: Pool,
  ) {}

  /**
   * Returns the active TypeORM data source.
   */
  getDataSource(): DataSource {
    return this.dataSource;
  }

  /**
   * Closes database handles on app shutdown so CLI scripts (e.g. seed) can exit cleanly.
   */
  async onApplicationShutdown(): Promise<void> {
    if (this.dataSource.isInitialized) {
      await this.dataSource.destroy();
    }
    await this.pool.end();
  }
}
