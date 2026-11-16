import { Test, TestingModule } from '@nestjs/testing';
import { OidcService } from '@nestjs/authentication';
import { describe, expect, it, vi } from 'vitest';
import { OidcController } from './oidc.controller.js';

describe('OidcController', () => {
  let controller: OidcController;
  const oidc = { start: vi.fn(), finish: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OidcController],
      providers: [{ provide: OidcService, useValue: oidc }],
    }).compile();

    controller = module.get<OidcController>(OidcController);
  });

  it('starts a provider login and returns the redirect', async () => {
    const redirect = { url: 'https://accounts.google.com/o/oauth2/auth', cookies: [] };
    oidc.start.mockResolvedValue(redirect);

    await expect(controller.login('google', '/dashboard', undefined)).resolves.toEqual(redirect);
    expect(oidc.start).toHaveBeenCalledWith('google', { redirectTo: '/dashboard', link: false });
  });

  it('starts a link flow when link=true', async () => {
    oidc.start.mockResolvedValue({ url: 'https://accounts.google.com/o/oauth2/auth', cookies: [] });

    await controller.login('google', undefined, 'true');
    expect(oidc.start).toHaveBeenCalledWith('google', { redirectTo: undefined, link: true });
  });

  it('finishes a provider callback and returns the redirect', async () => {
    const redirect = { url: '/dashboard', cookies: [] };
    const query = { code: 'auth-code', state: 'opaque-state' };
    oidc.finish.mockResolvedValue(redirect);

    await expect(controller.callback('google', query)).resolves.toEqual(redirect);
    expect(oidc.finish).toHaveBeenCalledWith('google', query);
  });
});
