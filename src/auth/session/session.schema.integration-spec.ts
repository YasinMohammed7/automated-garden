import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthenticationStorage } from '@nestjs/authentication';
import type { SessionRecord } from '@nestjs/authentication';
import { createTestDb, truncateAll } from '../../../test/integration/test-db.js';
import { users } from '../../users/users.schema.js';
import { DrizzleSessionStore } from './drizzle-session.store.js';

const db = createTestDb();

const baseRecord: SessionRecord = {
  id: 'a'.repeat(64),
  userId: 'placeholder',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  expiresAt: new Date('2026-02-01T00:00:00Z'),
  lastActiveAt: new Date('2026-01-15T00:00:00Z'),
};

beforeEach(async () => {
  await truncateAll(db);
});

afterAll(async () => {
  await db.$client.end();
});

describe('sessions schema (integration)', () => {
  it('stores, reads, and deletes a session', async () => {
    const [user] = await db
      .insert(users)
      .values({ emailAddress: 's@example.com', emailVerified: true })
      .returning();

    const store = new DrizzleSessionStore(db, {
      registerSource: vi.fn(),
    } as unknown as AuthenticationStorage);

    const record = { ...baseRecord, userId: user.userId };

    await store.createSession(record);

    const read = await store.getSession(record.id);
    expect(read).toMatchObject({ id: record.id, userId: user.userId });

    await expect(store.deleteSession(record.id)).resolves.toBe(true);
    await expect(store.getSession(record.id)).resolves.toBeUndefined();
  });
});
