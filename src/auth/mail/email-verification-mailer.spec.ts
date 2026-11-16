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
  expiresAt: new Date(),
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

  it('accepts a link to deliver', async () => {
    const mailer = await createMailer(repoMock(), registryMock());

    expect(() => mailer.send(link)).not.toThrow();
  });
});
