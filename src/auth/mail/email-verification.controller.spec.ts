import { BadRequestException, HttpException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EmailVerificationService } from '@nestjs/authentication';
import { describe, expect, it, vi } from 'vitest';
import type { User } from '../../users/users.schema.js';
import { EmailVerificationController } from './email-verification.controller.js';
import { EmailVerificationMailer } from './email-verification-mailer.js';

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
  const mailer = { consumeCode: vi.fn(), resendCooldownSeconds: vi.fn(), markSent: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmailVerificationController],
      providers: [
        { provide: EmailVerificationService, useValue: service },
        { provide: EmailVerificationMailer, useValue: mailer },
      ],
    }).compile();

    controller = module.get<EmailVerificationController>(EmailVerificationController);
  });

  it('sends a verification code for the signed-in user', async () => {
    mailer.resendCooldownSeconds.mockReturnValue(0);
    service.send.mockResolvedValue({ expiresAt: new Date() });

    await controller.send(user);
    expect(mailer.resendCooldownSeconds).toHaveBeenCalledWith('user-1');
    expect(mailer.markSent).toHaveBeenCalledWith('user-1');
    expect(service.send).toHaveBeenCalledWith({ id: 'user-1', email: 'john.doe@example.com' });
  });

  it('rejects a resend while the cooldown is active', async () => {
    mailer.resendCooldownSeconds.mockReturnValue(42);

    await expect(controller.send(user)).rejects.toBeInstanceOf(HttpException);
    await expect(controller.send(user)).rejects.toThrow(
      'Please wait 42 seconds before requesting another code',
    );
    expect(service.send).not.toHaveBeenCalled();
    expect(mailer.markSent).not.toHaveBeenCalled();
  });

  it('verifies a code by resolving its token', async () => {
    mailer.consumeCode.mockReturnValue('the-token');
    service.verify.mockResolvedValue({ userId: 'user-1', email: 'john.doe@example.com' });

    await expect(controller.verify({ code: '123456' })).resolves.toEqual({
      userId: 'user-1',
      email: 'john.doe@example.com',
    });
    expect(mailer.consumeCode).toHaveBeenCalledWith('123456');
    expect(service.verify).toHaveBeenCalledWith('the-token');
  });

  it('rejects an unknown or expired code', async () => {
    mailer.consumeCode.mockReturnValue(undefined);

    await expect(controller.verify({ code: '000000' })).rejects.toBeInstanceOf(BadRequestException);
    expect(service.verify).not.toHaveBeenCalled();
  });

  it('rejects a code whose token is unknown or used', async () => {
    mailer.consumeCode.mockReturnValue('the-token');
    service.verify.mockResolvedValue(null);

    await expect(controller.verify({ code: '123456' })).rejects.toBeInstanceOf(BadRequestException);
  });
});
