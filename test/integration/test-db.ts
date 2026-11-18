import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { relations } from '../../src/database/database.js';

function databaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error('TEST_DATABASE_URL is required for integration tests');
  }
  return url;
}

export function createTestDb() {
  return drizzle(databaseUrl(), { relations });
}

export async function truncateAll(db: NodePgDatabase<typeof relations>): Promise<void> {
  await db.execute(
    sql`TRUNCATE TABLE users, oidc_identities, gardens, plants, realtime_plant_metrics, sessions RESTART IDENTITY CASCADE`,
  );
}
