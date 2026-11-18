import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { gardens } from '../garden/garden.schema.js';
import { users } from '../users/users.schema.js';
import { createTestDb, truncateAll } from '../../test/integration/test-db.js';
import { PlantsRepository } from './plant.repository.js';
import { plants } from './plant.schema.js';

const db = createTestDb();
const repo = new PlantsRepository(db);

const input = {
  plantName: 'Tomato',
  species: 'Solanum lycopersicum',
  plantType: 'vegetable' as const,
  plantationDate: '2026-05-01',
  surfaceAreaRequired: 3,
  idealHumidityLevel: 60,
};

async function seedGarden(totalSurfaceArea = 10): Promise<{ userId: string; gardenId: string }> {
  const [user] = await db
    .insert(users)
    .values({ emailAddress: 'test@example.com', emailVerified: true })
    .returning();
  const [garden] = await db
    .insert(gardens)
    .values({ gardenName: 'Test garden', totalSurfaceArea, userId: user.userId })
    .returning();
  return { userId: user.userId, gardenId: garden.gardenId };
}

beforeEach(async () => {
  await truncateAll(db);
});

afterAll(async () => {
  await db.$client.end();
});

describe('PlantsRepository (integration)', () => {
  it('creates a plant when the garden has room', async () => {
    const { userId, gardenId } = await seedGarden();

    const result = await repo.createWithCapacity(userId, gardenId, input);

    expect(result).toMatchObject({ ok: true });
    const rows = await db.select().from(plants).where(eq(plants.gardenId, gardenId));
    expect(rows).toHaveLength(1);
  });

  it('rejects a plant that would exceed the garden total', async () => {
    const { userId, gardenId } = await seedGarden(10);
    await db
      .insert(plants)
      .values({ ...input, gardenId, surfaceAreaRequired: 8 })
      .returning();

    const result = await repo.createWithCapacity(userId, gardenId, input);

    expect(result).toMatchObject({
      ok: false,
      reason: 'overcrowded',
      requiredArea: 3,
      availableArea: 2,
    });
  });

  it('reports garden-not-found for a missing or foreign garden', async () => {
    const { userId } = await seedGarden();

    const result = await repo.createWithCapacity(
      userId,
      '00000000-0000-0000-0000-000000000000',
      input,
    );

    expect(result).toEqual({ ok: false, reason: 'garden-not-found' });
  });

  it('rejects a blank plant name through the check constraint', async () => {
    const { gardenId } = await seedGarden();

    await expect(
      db
        .insert(plants)
        .values({ ...input, gardenId, plantName: '   ' })
        .returning(),
    ).rejects.toThrow();
  });

  it('deletes a garden together with its plants', async () => {
    const { gardenId } = await seedGarden();
    await db
      .insert(plants)
      .values({ ...input, gardenId })
      .returning();

    await db.delete(gardens).where(eq(gardens.gardenId, gardenId));

    const remaining = await db.select().from(plants).where(eq(plants.gardenId, gardenId));
    expect(remaining).toHaveLength(0);
  });

  it('serializes concurrent adds so capacity is never exceeded', async () => {
    const { userId, gardenId } = await seedGarden(10);

    const results = await Promise.all(
      Array.from({ length: 5 }, () => repo.createWithCapacity(userId, gardenId, input)),
    );

    const ok = results.filter((result) => result.ok);
    const rejected = results.filter((result) => !result.ok);

    expect(ok).toHaveLength(3);
    expect(rejected.every((result) => !result.ok && result.reason === 'overcrowded')).toBe(true);

    const rows = await db.select().from(plants).where(eq(plants.gardenId, gardenId));
    expect(rows).toHaveLength(3);
    const total = rows.reduce((sum, row) => sum + row.surfaceAreaRequired, 0);
    expect(total).toBe(9);
  });

  it('excludes the edited plant itself when growing its surface area', async () => {
    const { userId, gardenId } = await seedGarden(10);
    await db
      .insert(plants)
      .values({ ...input, gardenId, surfaceAreaRequired: 3 })
      .returning();
    const [other] = await db
      .insert(plants)
      .values({ ...input, gardenId, plantName: 'Basil', surfaceAreaRequired: 4 })
      .returning();

    // Others use 3 m², so 7 m² remain: growing Basil to 5 still fits.
    const fits = await repo.updateWithCapacity(userId, other.plantId, { surfaceAreaRequired: 5 });
    expect(fits).toMatchObject({ ok: true });

    // 8 m² would need 3 + 8 = 11 m² in a 10 m² garden.
    const over = await repo.updateWithCapacity(userId, other.plantId, { surfaceAreaRequired: 8 });
    expect(over).toMatchObject({
      ok: false,
      reason: 'overcrowded',
      requiredArea: 8,
      availableArea: 7,
    });
  });
});
