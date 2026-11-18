import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, truncateAll } from '../../test/integration/test-db.js';
import { users } from './users.schema.js';

const db = createTestDb();

beforeEach(async () => {
  await truncateAll(db);
});

afterAll(async () => {
  await db.$client.end();
});

describe('users schema (integration)', () => {
  it('rejects a blank first name', async () => {
    await expect(
      db.insert(users).values({ emailAddress: 'a@example.com', firstName: '   ' }).returning(),
    ).rejects.toThrow();
  });

  it('rejects a blank last name', async () => {
    await expect(
      db.insert(users).values({ emailAddress: 'a@example.com', lastName: '   ' }).returning(),
    ).rejects.toThrow();
  });

  it('rejects a negative age', async () => {
    await expect(
      db.insert(users).values({ emailAddress: 'a@example.com', age: -1 }).returning(),
    ).rejects.toThrow();
  });

  it('accepts a valid user with all optional fields', async () => {
    const rows = await db
      .insert(users)
      .values({
        emailAddress: 'a@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        age: 30,
      })
      .returning();
    expect(rows).toHaveLength(1);
    expect(rows[0].firstName).toBe('Jane');
  });
});
