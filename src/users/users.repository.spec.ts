import { describe, expect, it, vi } from 'vitest';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { UsersRepository } from './users.repository.js';
import type { User } from './users.schema.js';

const user: User = {
  userId: 'user-1',
  firstName: null,
  lastName: null,
  age: null,
  emailAddress: 'john.doe@example.com',
  emailVerified: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeRepo(db: unknown): UsersRepository {
  return new UsersRepository(db as NodePgDatabase);
}

describe('UsersRepository', () => {
  it('marks the email verified with a conditional update and reports the row count', async () => {
    const returning = vi.fn().mockResolvedValue([{ userId: 'user-1' }]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    const update = vi.fn().mockReturnValue({ set });
    const repo = makeRepo({ update });

    await expect(repo.markEmailVerified('user-1', 'john.doe@example.com')).resolves.toBe(true);
    expect(set).toHaveBeenCalledWith({ emailVerified: true });
    expect(where).toHaveBeenCalled();

    returning.mockResolvedValue([]);
    await expect(repo.markEmailVerified('user-1', 'john.doe@example.com')).resolves.toBe(false);
  });

  it('links an identity with onConflictDoNothing and resolves the user', async () => {
    const onConflictDoNothing = vi.fn().mockResolvedValue(undefined);
    const values = vi.fn().mockReturnValue({ onConflictDoNothing });
    const insert = vi.fn().mockReturnValue({ values });
    const repo = makeRepo({ insert });
    const findById = vi.spyOn(repo, 'findById').mockResolvedValue(user);

    await expect(repo.linkIdentity('user-1', 'google', 'subject-1')).resolves.toBe(user);
    expect(values).toHaveBeenCalledWith({
      provider: 'google',
      subject: 'subject-1',
      userId: 'user-1',
    });
    expect(onConflictDoNothing).toHaveBeenCalled();
    expect(findById).toHaveBeenCalledWith('user-1');
  });

  it('resolves the linked user from an identity', async () => {
    const where = vi.fn().mockResolvedValue([{ userId: 'user-9' }]);
    const from = vi.fn().mockReturnValue({ where });
    const select = vi.fn().mockReturnValue({ from });
    const repo = makeRepo({ select });
    const findById = vi.spyOn(repo, 'findById').mockResolvedValue(user);

    await expect(repo.findByIdentity('google', 'subject-1')).resolves.toBe(user);
    expect(findById).toHaveBeenCalledWith('user-9');
  });

  it('returns undefined when no identity exists', async () => {
    const where = vi.fn().mockResolvedValue([]);
    const from = vi.fn().mockReturnValue({ where });
    const select = vi.fn().mockReturnValue({ from });
    const repo = makeRepo({ select });
    const findById = vi.spyOn(repo, 'findById');

    await expect(repo.findByIdentity('google', 'subject-1')).resolves.toBeUndefined();
    expect(findById).not.toHaveBeenCalled();
  });

  it('creates a user and throws when no row is returned', async () => {
    const returning = vi.fn().mockResolvedValue([user]);
    const values = vi.fn().mockReturnValue({ returning });
    const insert = vi.fn().mockReturnValue({ values });
    const repo = makeRepo({ insert });

    await expect(repo.create('john.doe@example.com', { emailVerified: true })).resolves.toBe(user);
    expect(values).toHaveBeenCalledWith({
      emailAddress: 'john.doe@example.com',
      emailVerified: true,
    });

    returning.mockResolvedValue([]);
    await expect(repo.create('john.doe@example.com', { emailVerified: true })).rejects.toThrow(
      'Failed to create user',
    );
  });
});
