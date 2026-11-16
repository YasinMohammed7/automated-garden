import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { HealthService } from './health.service.js';
import { HealthController } from './health.controller.js';

const service = { checkDatabase: vi.fn(), isGoogleConfigured: vi.fn() };

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    vi.clearAllMocks();

    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: service }],
    }).compile();

    controller = module.get(HealthController);
  });

  it('reports the server, database, and Google authentication as up', async () => {
    service.checkDatabase.mockResolvedValue(true);
    service.isGoogleConfigured.mockReturnValue(true);

    await expect(controller.check()).resolves.toEqual({
      server: 'up',
      database: 'connected',
      authentication: { google: 'connected' },
    });
  });

  it('reports the database and Google authentication as down when unavailable', async () => {
    service.checkDatabase.mockResolvedValue(false);
    service.isGoogleConfigured.mockReturnValue(false);

    await expect(controller.check()).resolves.toEqual({
      server: 'up',
      database: 'disconnected',
      authentication: { google: 'not configured' },
    });
  });
});
