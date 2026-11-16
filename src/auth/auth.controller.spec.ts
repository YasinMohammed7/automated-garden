import { Test, TestingModule } from '@nestjs/testing';
import { SignInService } from '@nestjs/authentication';
import { describe, expect, it, vi } from 'vitest';
import { AuthController } from './auth.controller.js';

describe('AuthController', () => {
  let controller: AuthController;
  const signIn = { signOut: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: SignInService, useValue: signIn }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('signs out the current session', async () => {
    signIn.signOut.mockResolvedValue(true);

    await controller.logout();
    expect(signIn.signOut).toHaveBeenCalledOnce();
  });
});
