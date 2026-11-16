import { ConflictException, ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuthenticationRegistry } from '@nestjs/authentication';
import type { OAuthTokens, OidcProfile, OidcResolveContext } from '@nestjs/authentication';
import { describe, expect, it, vi } from 'vitest';
import { UsersRepository } from '../users/users.repository.js';
import type { User } from '../users/users.schema.js';
import { GoogleOidcAccountResolver } from './google-oidc-account-resolver.js';

const profile: OidcProfile = {
  provider: 'google',
  subject: 'google-subject-1',
  email: 'john.doe@example.com',
  emailVerified: true,
  name: 'John Doe',
  claims: { email: 'john.doe@example.com' },
};

const tokens: OAuthTokens = { accessToken: 'access-token' };
const context: OidcResolveContext = {};

function user(overrides: Partial<User> = {}): User {
  return {
    userId: 'user-1',
    firstName: null,
    lastName: null,
    age: null,
    emailAddress: 'john.doe@example.com',
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function registryMock() {
  return { registerHandler: vi.fn() };
}

function repoMock() {
  return {
    findByIdentity: vi.fn<(provider: string, subject: string) => Promise<User | undefined>>(),
    findByEmail: vi.fn<(email: string) => Promise<User | undefined>>(),
    create: vi.fn<(email: string, options: { emailVerified: boolean }) => Promise<User>>(),
    linkIdentity:
      vi.fn<(userId: string, provider: string, subject: string) => Promise<User | undefined>>(),
  };
}

type Repo = ReturnType<typeof repoMock>;
type Registry = ReturnType<typeof registryMock>;

async function createResolver(repo: Repo, registry: Registry) {
  const module = await Test.createTestingModule({
    providers: [
      GoogleOidcAccountResolver,
      { provide: UsersRepository, useValue: repo },
      { provide: AuthenticationRegistry, useValue: registry },
    ],
  }).compile();

  return module.get(GoogleOidcAccountResolver);
}

describe('GoogleOidcAccountResolver', () => {
  it('registers itself as the oidc handler', async () => {
    const registry = registryMock();
    const resolver = await createResolver(repoMock(), registry);

    expect(registry.registerHandler).toHaveBeenCalledWith('oidc', resolver);
  });

  it('returns the existing identity when already linked', async () => {
    const repo = repoMock();
    repo.findByIdentity.mockResolvedValue(user({ userId: 'user-1' }));
    const resolver = await createResolver(repo, registryMock());

    await expect(resolver.resolveUser(profile, tokens, context)).resolves.toEqual({
      id: 'user-1',
    });
    expect(repo.findByEmail).not.toHaveBeenCalled();
  });

  it('creates a user and identity on first sign-in', async () => {
    const repo = repoMock();
    repo.findByIdentity.mockResolvedValue(undefined);
    repo.findByEmail.mockResolvedValue(undefined);
    repo.create.mockResolvedValue(user({ userId: 'user-2' }));
    const resolver = await createResolver(repo, registryMock());

    await expect(resolver.resolveUser(profile, tokens, context)).resolves.toEqual({
      id: 'user-2',
    });
    expect(repo.create).toHaveBeenCalledWith('john.doe@example.com', { emailVerified: true });
    expect(repo.linkIdentity).toHaveBeenCalledWith('user-2', 'google', 'google-subject-1');
  });

  it('links a verified existing account by email on first OIDC sign-in', async () => {
    const repo = repoMock();
    repo.findByIdentity.mockResolvedValue(undefined);
    repo.findByEmail.mockResolvedValue(user({ userId: 'user-3' }));
    const resolver = await createResolver(repo, registryMock());

    await expect(resolver.resolveUser(profile, tokens, context)).resolves.toEqual({
      id: 'user-3',
    });
    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.linkIdentity).toHaveBeenCalledWith('user-3', 'google', 'google-subject-1');
  });

  it('refuses to link an existing account whose email is not verified', async () => {
    const repo = repoMock();
    repo.findByIdentity.mockResolvedValue(undefined);
    repo.findByEmail.mockResolvedValue(user({ emailVerified: false }));
    const resolver = await createResolver(repo, registryMock());

    await expect(resolver.resolveUser(profile, tokens, context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(repo.linkIdentity).not.toHaveBeenCalled();
  });

  it('refuses a profile without a verified email', async () => {
    const repo = repoMock();
    repo.findByIdentity.mockResolvedValue(undefined);
    const resolver = await createResolver(repo, registryMock());

    await expect(
      resolver.resolveUser({ ...profile, emailVerified: false }, tokens, context),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(repo.findByEmail).not.toHaveBeenCalled();
  });

  it('links to the signed-in user during a link flow', async () => {
    const repo = repoMock();
    repo.findByIdentity.mockResolvedValue(undefined);
    const resolver = await createResolver(repo, registryMock());

    await expect(
      resolver.resolveUser(profile, tokens, { linkTo: { id: 'user-5' } }),
    ).resolves.toEqual({ id: 'user-5' });
    expect(repo.linkIdentity).toHaveBeenCalledWith('user-5', 'google', 'google-subject-1');
  });

  it('rejects a link flow when the identity already belongs to someone else', async () => {
    const repo = repoMock();
    repo.findByIdentity.mockResolvedValue(user({ userId: 'user-9' }));
    const resolver = await createResolver(repo, registryMock());

    await expect(
      resolver.resolveUser(profile, tokens, { linkTo: { id: 'user-5' } }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
