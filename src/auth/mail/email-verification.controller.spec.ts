import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EmailVerificationService } from '@nestjs/authentication';
import { describe, expect, it, vi } from 'vitest';
import type { User } from '../../users/users.schema.js';
import { EmailVerificationController } from './email-verification.controller.js';

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

describe('EmailVerificationController', () => {
  let controller: EmailVerificationController;
  const service = { send: vi.fn(), verify: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmailVerificationController],
      providers: [{ provide: EmailVerificationService, useValue: service }],
    }).compile();

    controller = module.get<EmailVerificationController>(EmailVerificationController);
  });

  it('sends a verification link for the signed-in user', async () => {
    service.send.mockResolvedValue({ expiresAt: new Date() });

    await controller.send(user);
    expect(service.send).toHaveBeenCalledWith({ id: 'user-1', email: 'john.doe@example.com' });
  });

  it('verifies a token', async () => {
    service.verify.mockResolvedValue({ userId: 'user-1', email: 'john.doe@example.com' });

    await expect(controller.verify({ token: 'the-token' })).resolves.toEqual({
      userId: 'user-1',
      email: 'john.doe@example.com',
    });
    expect(service.verify).toHaveBeenCalledWith('the-token');
  });

  it('rejects an unknown or expired token', async () => {
    service.verify.mockResolvedValue(null);

    await expect(controller.verify({ token: 'bad-token' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
