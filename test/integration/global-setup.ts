import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';

export default async function setup(): Promise<void> {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error('TEST_DATABASE_URL is required for integration tests');
  }

  const db = drizzle(url);
  await migrate(db, { migrationsFolder: 'drizzle' });
  await db.$client.end();
}
