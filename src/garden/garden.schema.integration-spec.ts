import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, truncateAll } from '../../test/integration/test-db.js';
import { users } from '../users/users.schema.js';
import { gardens } from './garden.schema.js';

const db = createTestDb();

async function seedUser(): Promise<string> {
  const [user] = await db
    .insert(users)
    .values({ emailAddress: 'g@example.com', emailVerified: true })
    .returning();
  return user.userId;
}

beforeEach(async () => {
  await truncateAll(db);
});

afterAll(async () => {
  await db.$client.end();
});

describe('gardens schema (integration)', () => {
  it('rejects a blank garden name', async () => {
    const userId = await seedUser();
    await expect(
      db.insert(gardens).values({ gardenName: '   ', totalSurfaceArea: 10, userId }).returning(),
    ).rejects.toThrow();
  });

  it('rejects a negative total surface area', async () => {
    const userId = await seedUser();
    await expect(
      db
        .insert(gardens)
        .values({ gardenName: 'Backyard', totalSurfaceArea: -1, userId })
        .returning(),
    ).rejects.toThrow();
  });

  it('accepts a valid garden', async () => {
    const userId = await seedUser();
    const rows = await db
      .insert(gardens)
      .values({ gardenName: 'Backyard', totalSurfaceArea: 10, userId })
      .returning();
    expect(rows).toHaveLength(1);
    expect(rows[0].totalSurfaceArea).toBe(10);
  });
});
