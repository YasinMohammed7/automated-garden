import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { oidcIdentities } from '../auth/oidc-identities.schema.js';
import { gardens } from '../garden/garden.schema.js';
import { createTestDb, truncateAll } from '../../test/integration/test-db.js';
import { plants } from '../plant/plant.schema.js';
import { users } from './users.schema.js';
import { UsersRepository } from './users.repository.js';

const db = createTestDb();
const repo = new UsersRepository(db);

beforeEach(async () => {
  await truncateAll(db);
});

afterAll(async () => {
  await db.$client.end();
});

describe('UsersRepository (integration)', () => {
  it('marks the email verified only when the address still matches', async () => {
    const [user] = await db
      .insert(users)
      .values({ emailAddress: 'john@example.com', emailVerified: false })
      .returning();

    await expect(repo.markEmailVerified(user.userId, 'john@example.com')).resolves.toBe(true);

    const [updated] = await db.select().from(users).where(eq(users.userId, user.userId));
    expect(updated.emailVerified).toBe(true);

    // A different address must not verify the account.
    await expect(repo.markEmailVerified(user.userId, 'someone-else@example.com')).resolves.toBe(
      false,
    );
  });

  it('links the same identity only once', async () => {
    const [user] = await db
      .insert(users)
      .values({ emailAddress: 'john@example.com', emailVerified: true })
      .returning();

    await repo.linkIdentity(user.userId, 'google', 'subject-1');
    await repo.linkIdentity(user.userId, 'google', 'subject-1');

    const rows = await db.select().from(oidcIdentities);
    expect(rows).toHaveLength(1);
  });

  it('cascades gardens and plants when the user is deleted', async () => {
    const [user] = await db
      .insert(users)
      .values({ emailAddress: 'john@example.com', emailVerified: true })
      .returning();
    const [garden] = await db
      .insert(gardens)
      .values({ gardenName: 'Backyard', totalSurfaceArea: 10, userId: user.userId })
      .returning();
    await db
      .insert(plants)
      .values({
        plantName: 'Tomato',
        species: 'Solanum lycopersicum',
        plantType: 'vegetable',
        plantationDate: '2026-05-01',
        surfaceAreaRequired: 2,
        idealHumidityLevel: 60,
        gardenId: garden.gardenId,
      })
      .returning();

    await db.delete(users).where(eq(users.userId, user.userId));

    expect(await db.select().from(gardens)).toHaveLength(0);
    expect(await db.select().from(plants)).toHaveLength(0);
  });
});
