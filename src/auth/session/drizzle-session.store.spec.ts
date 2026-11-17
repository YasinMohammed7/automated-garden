import { describe, expect, it, vi } from 'vitest';
import type { SessionRecord } from '@nestjs/authentication';
import type { Database } from '../../database/database.js';
import { DrizzleSessionStore } from './drizzle-session.store.js';

const baseRecord: SessionRecord = {
  id: 'a'.repeat(64),
  userId: 'user-1',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  expiresAt: new Date('2026-02-01T00:00:00Z'),
  lastActiveAt: new Date('2026-01-15T00:00:00Z'),
};

const row = {
  id: baseRecord.id,
  userId: 'user-1',
  createdAt: baseRecord.createdAt,
  expiresAt: baseRecord.expiresAt,
  lastActiveAt: baseRecord.lastActiveAt,
  mfa: null,
  metadata: null,
};

function makeStore(db: unknown): DrizzleSessionStore {
  const storage = { registerSource: vi.fn() };
  return new DrizzleSessionStore(db as Database, storage as never);
}

describe('DrizzleSessionStore', () => {
  it('registers itself as the session store source', () => {
    const storage = { registerSource: vi.fn() };
    new DrizzleSessionStore({} as Database, storage as never);
    expect(storage.registerSource).toHaveBeenCalled();
  });

  it('returns the mapped session when it exists', async () => {
    const where = vi.fn().mockResolvedValue([row]);
    const from = vi.fn().mockReturnValue({ where });
    const select = vi.fn().mockReturnValue({ from });
    const store = makeStore({ select });

    await expect(store.getSession(baseRecord.id)).resolves.toEqual({
      id: baseRecord.id,
      userId: 'user-1',
      createdAt: baseRecord.createdAt,
      expiresAt: baseRecord.expiresAt,
      lastActiveAt: baseRecord.lastActiveAt,
    });
    expect(where).toHaveBeenCalled();
  });

  it('returns undefined when the session does not exist', async () => {
    const where = vi.fn().mockResolvedValue([]);
    const from = vi.fn().mockReturnValue({ where });
    const select = vi.fn().mockReturnValue({ from });
    const store = makeStore({ select });

    await expect(store.getSession('missing')).resolves.toBeUndefined();
  });

  it('maps null mfa and metadata to absent fields', async () => {
    const where = vi.fn().mockResolvedValue([{ ...row, mfa: 'verified', metadata: { ua: 'x' } }]);
    const from = vi.fn().mockReturnValue({ where });
    const select = vi.fn().mockReturnValue({ from });
    const store = makeStore({ select });

    const result = await store.getSession(baseRecord.id);
    expect(result?.mfa).toBe('verified');
    expect(result?.metadata).toEqual({ ua: 'x' });
    expect(result).not.toHaveProperty('mfa', null);
    expect(result).not.toHaveProperty('metadata', null);
  });

  it('inserts a new session and drops expired ones', async () => {
    const values = vi.fn().mockResolvedValue(undefined);
    const insert = vi.fn().mockReturnValue({ values });
    const deleteWhere = vi.fn().mockResolvedValue(undefined);
    const del = vi.fn().mockReturnValue({ where: deleteWhere });
    const store = makeStore({ insert, delete: del });

    await store.createSession({ ...baseRecord, mfa: 'verified', metadata: { ua: 'x' } });

    expect(deleteWhere).toHaveBeenCalled();
    expect(values).toHaveBeenCalledWith({
      id: baseRecord.id,
      userId: 'user-1',
      createdAt: baseRecord.createdAt,
      expiresAt: baseRecord.expiresAt,
      lastActiveAt: baseRecord.lastActiveAt,
      mfa: 'verified',
      metadata: { ua: 'x' },
    });
  });

  it('inserts null for absent mfa and metadata', async () => {
    const values = vi.fn().mockResolvedValue(undefined);
    const insert = vi.fn().mockReturnValue({ values });
    const deleteWhere = vi.fn().mockResolvedValue(undefined);
    const del = vi.fn().mockReturnValue({ where: deleteWhere });
    const store = makeStore({ insert, delete: del });

    await store.createSession(baseRecord);

    expect(values).toHaveBeenCalledWith(expect.objectContaining({ mfa: null, metadata: null }));
  });

  it('touches a session with a forward-only conditional update', async () => {
    const where = vi.fn().mockResolvedValue(undefined);
    const set = vi.fn().mockReturnValue({ where });
    const update = vi.fn().mockReturnValue({ set });
    const store = makeStore({ update });

    await store.touchSession(baseRecord.id, baseRecord.lastActiveAt);

    expect(set).toHaveBeenCalledWith({ lastActiveAt: baseRecord.lastActiveAt });
    expect(where).toHaveBeenCalled();
  });

  it('reports whether deleteSession removed a row', async () => {
    const returning = vi.fn().mockResolvedValue([{ id: baseRecord.id }]);
    const where = vi.fn().mockReturnValue({ returning });
    const del = vi.fn().mockReturnValue({ where });
    const store = makeStore({ delete: del });

    await expect(store.deleteSession(baseRecord.id)).resolves.toBe(true);

    returning.mockResolvedValue([]);
    await expect(store.deleteSession(baseRecord.id)).resolves.toBe(false);
  });

  it('lists the sessions of a user', async () => {
    const where = vi.fn().mockResolvedValue([row, { ...row, id: 'b'.repeat(64) }]);
    const from = vi.fn().mockReturnValue({ where });
    const select = vi.fn().mockReturnValue({ from });
    const store = makeStore({ select });

    const result = await store.listUserSessions('user-1');
    expect(result).toHaveLength(2);
    expect(result.map((s) => s.userId)).toEqual(['user-1', 'user-1']);
    expect(where).toHaveBeenCalled();
  });

  it('deletes all sessions of a user', async () => {
    const where = vi.fn().mockResolvedValue(undefined);
    const del = vi.fn().mockReturnValue({ where });
    const store = makeStore({ delete: del });

    await store.deleteUserSessions('user-1');
    expect(where).toHaveBeenCalled();
  });
});
