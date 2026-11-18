import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, truncateAll } from '../../test/integration/test-db.js';
import { users } from '../users/users.schema.js';
import { gardens } from '../garden/garden.schema.js';
import { plants } from './plant.schema.js';

const db = createTestDb();

const base = {
  plantName: 'Tomato',
  species: 'Solanum lycopersicum',
  plantType: 'vegetable' as const,
  plantationDate: '2026-05-01',
  surfaceAreaRequired: 2,
  idealHumidityLevel: 60,
};

async function seedGarden(): Promise<string> {
  const [user] = await db
    .insert(users)
    .values({ emailAddress: 'p@example.com', emailVerified: true })
    .returning();
  const [garden] = await db
    .insert(gardens)
    .values({ gardenName: 'Backyard', totalSurfaceArea: 10, userId: user.userId })
    .returning();
  return garden.gardenId;
}

beforeEach(async () => {
  await truncateAll(db);
});

afterAll(async () => {
  await db.$client.end();
});

describe('plants schema (integration)', () => {
  it('rejects a blank species', async () => {
    const gardenId = await seedGarden();
    await expect(
      db
        .insert(plants)
        .values({ ...base, gardenId, species: '   ' })
        .returning(),
    ).rejects.toThrow();
  });

  it('rejects a negative surface area required', async () => {
    const gardenId = await seedGarden();
    await expect(
      db
        .insert(plants)
        .values({ ...base, gardenId, surfaceAreaRequired: -1 })
        .returning(),
    ).rejects.toThrow();
  });

  it('rejects a humidity level above 100', async () => {
    const gardenId = await seedGarden();
    await expect(
      db
        .insert(plants)
        .values({ ...base, gardenId, idealHumidityLevel: 101 })
        .returning(),
    ).rejects.toThrow();
  });

  it('accepts a valid plant', async () => {
    const gardenId = await seedGarden();
    const rows = await db
      .insert(plants)
      .values({ ...base, gardenId })
      .returning();
    expect(rows).toHaveLength(1);
    expect(rows[0].idealHumidityLevel).toBe(60);
  });
});
