import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { UsersRepository } from './users.repository.js';
import type { User } from './users.schema.js';
import { UsersService } from './users.service.js';

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

function repoMock() {
  return {
    findById: vi.fn<(userId: string) => Promise<User | undefined>>(),
    update:
      vi.fn<
        (
          userId: string,
          data: Partial<Pick<User, 'firstName' | 'lastName' | 'age'>>,
        ) => Promise<User | undefined>
      >(),
    delete: vi.fn<(userId: string) => Promise<boolean>>(),
  };
}

async function createService(repo: ReturnType<typeof repoMock>) {
  const module = await Test.createTestingModule({
    providers: [UsersService, { provide: UsersRepository, useValue: repo }],
  }).compile();

  return module.get(UsersService);
}

const profile = {
  firstName: null,
  lastName: null,
  age: null,
  emailAddress: 'john.doe@example.com',
  emailVerified: false,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
};

describe('UsersService', () => {
  it('returns the profile of the current user', async () => {
    const repo = repoMock();
    repo.findById.mockResolvedValue(user);
    const service = await createService(repo);

    await expect(service.findProfile('user-1')).resolves.toEqual(profile);
    expect(repo.findById).toHaveBeenCalledWith('user-1');
  });

  it('throws when the profile does not exist', async () => {
    const repo = repoMock();
    repo.findById.mockResolvedValue(undefined);
    const service = await createService(repo);

    await expect(service.findProfile('missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates the profile of the current user', async () => {
    const repo = repoMock();
    repo.update.mockResolvedValue(user);
    const service = await createService(repo);

    await expect(service.updateProfile('user-1', { firstName: 'John' })).resolves.toEqual(profile);
    expect(repo.update).toHaveBeenCalledWith('user-1', { firstName: 'John' });
  });

  it('throws when updating a missing profile', async () => {
    const repo = repoMock();
    repo.update.mockResolvedValue(undefined);
    const service = await createService(repo);

    await expect(service.updateProfile('missing', {})).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deletes the current user account', async () => {
    const repo = repoMock();
    repo.delete.mockResolvedValue(true);
    const service = await createService(repo);

    await expect(service.deleteProfile('user-1')).resolves.toBeUndefined();
    expect(repo.delete).toHaveBeenCalledWith('user-1');
  });

  it('throws when deleting a missing account', async () => {
    const repo = repoMock();
    repo.delete.mockResolvedValue(false);
    const service = await createService(repo);

    await expect(service.deleteProfile('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
