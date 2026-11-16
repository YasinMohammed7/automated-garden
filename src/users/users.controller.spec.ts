import { Test } from '@nestjs/testing';
import { SignInService } from '@nestjs/authentication';
import { describe, expect, it, vi } from 'vitest';
import type { User } from './users.schema.js';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

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

function serviceMock() {
  return {
    findProfile: vi.fn<(userId: string) => Promise<User>>(),
    updateProfile: vi.fn<(userId: string, dto: UpdateUserDto) => Promise<User>>(),
    deleteProfile: vi.fn<(userId: string) => Promise<void>>(),
  };
}

function signInMock() {
  return { signOutEverywhere: vi.fn<(userId: string) => Promise<void>>() };
}

async function createController(
  service: ReturnType<typeof serviceMock>,
  signIn: ReturnType<typeof signInMock>,
) {
  const module = await Test.createTestingModule({
    controllers: [UsersController],
    providers: [
      { provide: UsersService, useValue: service },
      { provide: SignInService, useValue: signIn },
    ],
  }).compile();

  return module.get(UsersController);
}

describe('UsersController', () => {
  it('returns the current user profile', async () => {
    const service = serviceMock();
    service.findProfile.mockResolvedValue(user);
    const controller = await createController(service, signInMock());

    await expect(controller.getProfile(user)).resolves.toBe(user);
    expect(service.findProfile).toHaveBeenCalledWith('user-1');
  });

  it('updates the current user profile', async () => {
    const service = serviceMock();
    service.updateProfile.mockResolvedValue(user);
    const dto: UpdateUserDto = { firstName: 'John' };
    const controller = await createController(service, signInMock());

    await expect(controller.updateProfile(user, dto)).resolves.toBe(user);
    expect(service.updateProfile).toHaveBeenCalledWith('user-1', dto);
  });

  it('deletes the account and signs out everywhere', async () => {
    const service = serviceMock();
    service.deleteProfile.mockResolvedValue(undefined);
    const signIn = signInMock();
    signIn.signOutEverywhere.mockResolvedValue(undefined);
    const controller = await createController(service, signIn);

    await controller.removeMe(user);
    expect(service.deleteProfile).toHaveBeenCalledWith('user-1');
    expect(signIn.signOutEverywhere).toHaveBeenCalledWith('user-1');
  });
});
