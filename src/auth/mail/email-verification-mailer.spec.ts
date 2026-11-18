import { Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuthenticationRegistry } from '@nestjs/authentication';
import type { EmailVerificationLink } from '@nestjs/authentication';
import { describe, expect, it, vi } from 'vitest';
import { UsersRepository } from '../../users/users.repository.js';
import { EmailVerificationMailer } from './email-verification-mailer.js';

const link: EmailVerificationLink = {
  userId: 'user-1',
  email: 'john.doe@example.com',
  url: 'http://localhost:3001/verify-email?token=abc',
  expiresAt: new Date(Date.now() + 3_600_000),
};

function registryMock() {
  return { registerHandler: vi.fn() };
}

function repoMock() {
  return {
    markEmailVerified: vi.fn<(userId: string, email: string) => Promise<boolean>>(),
  };
}

async function createMailer(
  repo: ReturnType<typeof repoMock>,
  registry: ReturnType<typeof registryMock>,
) {
  const module = await Test.createTestingModule({
    providers: [
      EmailVerificationMailer,
      { provide: UsersRepository, useValue: repo },
      { provide: AuthenticationRegistry, useValue: registry },
    ],
  }).compile();

  return module.get(EmailVerificationMailer);
}

describe('EmailVerificationMailer', () => {
  it('registers itself as the emailVerification handler', async () => {
    const registry = registryMock();
    const mailer = await createMailer(repoMock(), registry);

    expect(registry.registerHandler).toHaveBeenCalledWith('emailVerification', mailer);
  });

  it('delegates markVerified to the repository', async () => {
    const repo = repoMock();
    repo.markEmailVerified.mockResolvedValue(true);
    const mailer = await createMailer(repo, registryMock());

    await expect(mailer.markVerified('user-1', 'john.doe@example.com')).resolves.toBe(true);
    expect(repo.markEmailVerified).toHaveBeenCalledWith('user-1', 'john.doe@example.com');
  });

  it('logs a 6-digit code that consumes to the link token', async () => {
    const logSpy = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const mailer = await createMailer(repoMock(), registryMock());

    mailer.send(link);

    const message = logSpy.mock.calls
      .map((args) => args[0])
      .find((arg): arg is string => typeof arg === 'string' && arg.includes('Verification code'));
    expect(message).toBeDefined();
    const code = message?.match(/\d{6}/)?.[0];
    expect(code).toBeDefined();

    expect(mailer.consumeCode(code as string)).toBe('abc');
    // Single use: the code is gone after consumption.
    expect(mailer.consumeCode(code as string)).toBeUndefined();
    logSpy.mockRestore();
  });

  it('returns undefined for an unknown code', async () => {
    const mailer = await createMailer(repoMock(), registryMock());

    expect(mailer.consumeCode('000000')).toBeUndefined();
  });

  it('allows a first send and then enforces a one-minute cooldown', async () => {
    const mailer = await createMailer(repoMock(), registryMock());
    const now = Date.now();

    expect(mailer.resendCooldownSeconds('user-1', now)).toBe(0);
    mailer.markSent('user-1', now);

    const wait = mailer.resendCooldownSeconds('user-1', now + 30_000);
    expect(wait).toBe(30);
  });

  it('lifts the cooldown after one minute', async () => {
    const mailer = await createMailer(repoMock(), registryMock());
    const now = Date.now();

    mailer.markSent('user-1', now);
    expect(mailer.resendCooldownSeconds('user-1', now + 60_000)).toBe(0);
  });

  it('does not issue a code when the link has no token', async () => {
    const logSpy = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const errorSpy = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const mailer = await createMailer(repoMock(), registryMock());

    mailer.send({ ...link, url: 'http://localhost:3001/verify-email' });

    const codeLog = logSpy.mock.calls
      .map((args) => args[0])
      .find((arg): arg is string => typeof arg === 'string' && arg.includes('Verification code'));
    expect(codeLog).toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('invalidates the previous code when a new one is issued for the user', async () => {
    const logSpy = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const mailer = await createMailer(repoMock(), registryMock());

    mailer.send({ ...link, url: 'http://localhost:3001/verify-email?token=first' });
    mailer.send({ ...link, url: 'http://localhost:3001/verify-email?token=second' });

    const codes = logSpy.mock.calls
      .map((args) => args[0])
      .filter((arg): arg is string => typeof arg === 'string' && arg.includes('Verification code'))
      .map((message) => message.match(/\d{6}/)?.[0]);

    expect(codes).toHaveLength(2);
    // The first code was replaced: it no longer resolves to anything.
    expect(mailer.consumeCode(codes[0] as string)).toBeUndefined();
    expect(mailer.consumeCode(codes[1] as string)).toBe('second');
    logSpy.mockRestore();
  });

  it('returns undefined for an expired code', async () => {
    const logSpy = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const mailer = await createMailer(repoMock(), registryMock());

    mailer.send({ ...link, expiresAt: new Date(Date.now() - 1_000) });

    const message = logSpy.mock.calls
      .map((args) => args[0])
      .find((arg): arg is string => typeof arg === 'string' && arg.includes('Verification code'));
    const code = message?.match(/\d{6}/)?.[0];
    expect(code).toBeDefined();

    expect(mailer.consumeCode(code as string)).toBeUndefined();
    logSpy.mockRestore();
  });

  it('keeps another user code when a new one is issued', async () => {
    const logSpy = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    const mailer = await createMailer(repoMock(), registryMock());

    mailer.send({
      ...link,
      userId: 'user-1',
      url: 'http://localhost:3001/verify-email?token=first',
    });
    mailer.send({
      ...link,
      userId: 'user-2',
      url: 'http://localhost:3001/verify-email?token=second',
    });

    const codes = logSpy.mock.calls
      .map((args) => args[0])
      .filter((arg): arg is string => typeof arg === 'string' && arg.includes('Verification code'))
      .map((message) => message.match(/\d{6}/)?.[0]);

    expect(codes).toHaveLength(2);
    // A code for a different user is left untouched.
    expect(mailer.consumeCode(codes[0] as string)).toBe('first');
    expect(mailer.consumeCode(codes[1] as string)).toBe('second');
    logSpy.mockRestore();
  });
});
