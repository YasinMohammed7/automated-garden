import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { getDrizzleToken } from '@nestjs/drizzle';
import { describe, expect, it, vi } from 'vitest';
import { HealthService } from './health.service.js';

function dbMock() {
  return { execute: vi.fn() };
}

function configMock(get: (key: string) => string | undefined) {
  return { get: vi.fn(get) };
}

async function createService(db: ReturnType<typeof dbMock>, config: ReturnType<typeof configMock>) {
  const module = await Test.createTestingModule({
    providers: [
      HealthService,
      { provide: getDrizzleToken(), useValue: db },
      { provide: ConfigService, useValue: config },
    ],
  }).compile();

  return module.get(HealthService);
}

describe('HealthService', () => {
  it('reports the database as connected when SELECT 1 succeeds', async () => {
    const db = dbMock();
    db.execute.mockResolvedValue(undefined);
    const service = await createService(
      db,
      configMock(() => undefined),
    );

    await expect(service.checkDatabase()).resolves.toBe(true);
    expect(db.execute).toHaveBeenCalledOnce();
  });

  it('reports the database as disconnected when the query fails', async () => {
    const db = dbMock();
    db.execute.mockRejectedValue(new Error('connection refused'));
    const service = await createService(
      db,
      configMock(() => undefined),
    );

    await expect(service.checkDatabase()).resolves.toBe(false);
  });

  it('reports Google authentication as configured when both credentials are set', async () => {
    const config = configMock((key) =>
      key === 'GOOGLE_CLIENT_ID' || key === 'GOOGLE_CLIENT_SECRET' ? 'set' : undefined,
    );
    const service = await createService(dbMock(), config);

    expect(service.isGoogleConfigured()).toBe(true);
  });

  it('reports Google authentication as not configured when a credential is missing', async () => {
    const config = configMock((key) => (key === 'GOOGLE_CLIENT_ID' ? 'set' : undefined));
    const service = await createService(dbMock(), config);

    expect(service.isGoogleConfigured()).toBe(false);
  });
});
