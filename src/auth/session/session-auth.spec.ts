import { Test } from '@nestjs/testing';
import { AuthenticationRegistry, SessionService } from '@nestjs/authentication';
import type { SessionRecord } from '@nestjs/authentication';
import { describe, expect, it, vi } from 'vitest';
import type { User } from '../../users/users.schema.js';
import { UsersRepository } from '../../users/users.repository.js';
import { SessionAuth } from './session-auth.js';

const user: User = {
  userId: 'user-1',
  firstName: null,
  lastName: null,
  age: null,
  emailAddress: 'john.doe@example.com',
  emailVerified: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const session: SessionRecord = {
  id: 'session-id',
  userId: 'user-1',
  createdAt: new Date(),
  expiresAt: new Date(),
  lastActiveAt: new Date(),
};

function registryMock() {
  return { registerProvider: vi.fn() };
}

function repoMock() {
  return {
    findById: vi.fn<(userId: string) => Promise<User | undefined>>(),
  };
}

async function createSessionAuth(
  repo: ReturnType<typeof repoMock>,
  registry: ReturnType<typeof registryMock>,
) {
  const module = await Test.createTestingModule({
    providers: [
      SessionAuth,
      { provide: UsersRepository, useValue: repo },
      { provide: AuthenticationRegistry, useValue: registry },
      { provide: SessionService, useValue: {} },
    ],
  }).compile();

  return module.get(SessionAuth);
}

describe('SessionAuth', () => {
  it('registers itself as a credential provider', async () => {
    const registry = registryMock();
    const auth = await createSessionAuth(repoMock(), registry);

    expect(registry.registerProvider).toHaveBeenCalledWith(auth);
  });

  it('loads the user for a live session', async () => {
    const repo = repoMock();
    repo.findById.mockResolvedValue(user);
    const auth = await createSessionAuth(repo, registryMock());

    await expect(auth.validate(session)).resolves.toBe(user);
    expect(repo.findById).toHaveBeenCalledWith('user-1');
  });
});
