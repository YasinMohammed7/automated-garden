import { describe, expect, it, vi } from 'vitest';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { GardensRepository } from './garden.repository.js';
import type { Garden } from './garden.schema.js';

const garden: Garden = {
  gardenId: 'garden-1',
  gardenName: 'Backyard',
  totalSurfaceArea: 12.5,
  locationDescription: 'Patio',
  userId: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeRepo(db: unknown): GardensRepository {
  return new GardensRepository(db as NodePgDatabase);
}

describe('GardensRepository', () => {
  it('creates a garden with the caller userId and throws when no row is returned', async () => {
    const returning = vi.fn().mockResolvedValue([garden]);
    const values = vi.fn().mockReturnValue({ returning });
    const insert = vi.fn().mockReturnValue({ values });
    const repo = makeRepo({ insert });

    await expect(
      repo.create('user-1', { gardenName: 'Backyard', totalSurfaceArea: 12.5 }),
    ).resolves.toBe(garden);
    expect(values).toHaveBeenCalledWith({
      gardenName: 'Backyard',
      totalSurfaceArea: 12.5,
      userId: 'user-1',
    });

    returning.mockResolvedValue([]);
    await expect(
      repo.create('user-1', { gardenName: 'Backyard', totalSurfaceArea: 12.5 }),
    ).rejects.toThrow('Failed to create garden');
  });

  it('returns the first garden of an ownership-scoped lookup', async () => {
    const where = vi.fn().mockResolvedValue([garden]);
    const from = vi.fn().mockReturnValue({ where });
    const select = vi.fn().mockReturnValue({ from });
    const repo = makeRepo({ select });

    await expect(repo.findById('user-1', 'garden-1')).resolves.toBe(garden);
    expect(where).toHaveBeenCalled();
  });

  it('returns undefined when the garden is not found', async () => {
    const where = vi.fn().mockResolvedValue([]);
    const from = vi.fn().mockReturnValue({ where });
    const select = vi.fn().mockReturnValue({ from });
    const repo = makeRepo({ select });

    await expect(repo.findById('user-1', 'garden-1')).resolves.toBeUndefined();
  });

  it('reports whether delete removed a row', async () => {
    const returning = vi.fn().mockResolvedValue([{ gardenId: 'garden-1' }]);
    const where = vi.fn().mockReturnValue({ returning });
    const del = vi.fn().mockReturnValue({ where });
    const repo = makeRepo({ delete: del });

    await expect(repo.delete('user-1', 'garden-1')).resolves.toBe(true);

    returning.mockResolvedValue([]);
    await expect(repo.delete('user-1', 'garden-1')).resolves.toBe(false);
  });

  it('lists the gardens of a user', async () => {
    const where = vi.fn().mockResolvedValue([garden]);
    const from = vi.fn().mockReturnValue({ where });
    const select = vi.fn().mockReturnValue({ from });
    const repo = makeRepo({ select });

    await expect(repo.findByUser('user-1')).resolves.toEqual([garden]);
    expect(where).toHaveBeenCalled();
  });

  it('updates a garden and returns the first row', async () => {
    const returning = vi.fn().mockResolvedValue([{ ...garden, gardenName: 'Front Yard' }]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    const update = vi.fn().mockReturnValue({ set });
    const repo = makeRepo({ update });

    const result = await repo.update('user-1', 'garden-1', { gardenName: 'Front Yard' });
    expect(result).toMatchObject({ gardenName: 'Front Yard' });
    expect(set).toHaveBeenCalledWith({ gardenName: 'Front Yard' });
  });
});
