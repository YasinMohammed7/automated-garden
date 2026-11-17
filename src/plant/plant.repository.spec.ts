import { describe, expect, it, vi } from 'vitest';
import type { Database } from '../database/database.js';
import { PlantsRepository } from './plant.repository.js';
import type { Plant } from './plant.schema.js';

const plant: Plant = {
  plantId: 'plant-1',
  plantName: 'Tomato',
  species: 'Solanum lycopersicum',
  plantType: 'vegetable',
  plantationDate: '2026-05-01',
  surfaceAreaRequired: 1.5,
  idealHumidityLevel: 60,
  gardenId: 'garden-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const garden = { gardenId: 'garden-1', totalSurfaceArea: 12.5 };

const input = {
  plantName: 'Tomato',
  species: 'Solanum lycopersicum',
  plantType: 'vegetable' as const,
  plantationDate: '2026-05-01',
  surfaceAreaRequired: 1.5,
  idealHumidityLevel: 60,
};

function makeRepo(db: unknown): PlantsRepository {
  return new PlantsRepository(db as Database);
}

describe('PlantsRepository', () => {
  it('fetches the plants of a garden through the relational query', async () => {
    const findFirst = vi.fn().mockResolvedValue({ plants: [plant] });
    const repo = makeRepo({ query: { gardens: { findFirst } } });

    await expect(repo.findByGarden('user-1', 'garden-1')).resolves.toEqual([plant]);
    expect(findFirst).toHaveBeenCalledWith({
      where: { gardenId: 'garden-1', userId: 'user-1' },
      with: { plants: true },
    });
  });

  it('returns undefined when the garden has no plants or does not exist', async () => {
    const findFirst = vi.fn().mockResolvedValue(undefined);
    const repo = makeRepo({ query: { gardens: { findFirst } } });

    await expect(repo.findByGarden('user-1', 'garden-1')).resolves.toBeUndefined();
  });

  it('creates a plant when the garden has room', async () => {
    const gardenFor = vi.fn().mockResolvedValue([garden]);
    const gardenWhere = vi.fn().mockReturnValue({ for: gardenFor });
    const gardenFrom = vi.fn().mockReturnValue({ where: gardenWhere });

    const sumWhere = vi.fn().mockResolvedValue([{ total: 5 }]);
    const sumFrom = vi.fn().mockReturnValue({ where: sumWhere });

    const returning = vi.fn().mockResolvedValue([plant]);
    const values = vi.fn().mockReturnValue({ returning });
    const insert = vi.fn().mockReturnValue({ values });

    const tx = {
      select: vi
        .fn()
        .mockImplementationOnce(() => ({ from: gardenFrom }))
        .mockImplementationOnce(() => ({ from: sumFrom })),
      insert,
    };
    const transaction = vi.fn((callback) => callback(tx));
    const repo = makeRepo({ transaction });

    await expect(repo.createWithCapacity('user-1', 'garden-1', input)).resolves.toEqual({
      ok: true,
      plant,
    });
    expect(gardenFor).toHaveBeenCalledWith('update');
    expect(values).toHaveBeenCalledWith({ ...input, gardenId: 'garden-1' });
  });

  it('reports garden-not-found when the garden is missing or not owned', async () => {
    const gardenFor = vi.fn().mockResolvedValue([]);
    const gardenWhere = vi.fn().mockReturnValue({ for: gardenFor });
    const gardenFrom = vi.fn().mockReturnValue({ where: gardenWhere });

    const tx = { select: vi.fn(() => ({ from: gardenFrom })), insert: vi.fn() };
    const transaction = vi.fn((callback) => callback(tx));
    const repo = makeRepo({ transaction });

    await expect(repo.createWithCapacity('user-1', 'garden-1', input)).resolves.toEqual({
      ok: false,
      reason: 'garden-not-found',
    });
    expect(tx.insert).not.toHaveBeenCalled();
  });

  it('reports overcrowded when the plant does not fit', async () => {
    const gardenFor = vi.fn().mockResolvedValue([garden]);
    const gardenWhere = vi.fn().mockReturnValue({ for: gardenFor });
    const gardenFrom = vi.fn().mockReturnValue({ where: gardenWhere });

    const sumWhere = vi.fn().mockResolvedValue([{ total: 12 }]);
    const sumFrom = vi.fn().mockReturnValue({ where: sumWhere });

    const tx = {
      select: vi
        .fn()
        .mockImplementationOnce(() => ({ from: gardenFrom }))
        .mockImplementationOnce(() => ({ from: sumFrom })),
      insert: vi.fn(),
    };
    const transaction = vi.fn((callback) => callback(tx));
    const repo = makeRepo({ transaction });

    await expect(repo.createWithCapacity('user-1', 'garden-1', input)).resolves.toEqual({
      ok: false,
      reason: 'overcrowded',
      requiredArea: 1.5,
      availableArea: 0.5,
    });
    expect(tx.insert).not.toHaveBeenCalled();
  });

  it('updates a plant whose surface area still fits, excluding itself from the sum', async () => {
    const subWhere = vi.fn().mockReturnValue([]);
    const subFrom = vi.fn().mockReturnValue({ where: subWhere });

    const plantWhere = vi.fn().mockResolvedValue([plant]);
    const plantFrom = vi.fn().mockReturnValue({ where: plantWhere });

    const gardenFor = vi.fn().mockResolvedValue([garden]);
    const gardenWhere = vi.fn().mockReturnValue({ for: gardenFor });
    const gardenFrom = vi.fn().mockReturnValue({ where: gardenWhere });

    const sumWhere = vi.fn().mockResolvedValue([{ total: 5 }]);
    const sumFrom = vi.fn().mockReturnValue({ where: sumWhere });

    const returning = vi.fn().mockResolvedValue([{ ...plant, surfaceAreaRequired: 2 }]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    const update = vi.fn().mockReturnValue({ set });

    const tx = {
      select: vi
        .fn()
        .mockImplementationOnce(() => ({ from: subFrom }))
        .mockImplementationOnce(() => ({ from: plantFrom }))
        .mockImplementationOnce(() => ({ from: gardenFrom }))
        .mockImplementationOnce(() => ({ from: sumFrom })),
      update,
    };
    const transaction = vi.fn((callback) => callback(tx));
    const repo = makeRepo({ transaction });

    const result = await repo.updateWithCapacity('user-1', 'plant-1', { surfaceAreaRequired: 2 });
    expect(result).toMatchObject({ ok: true });
    expect(gardenFor).toHaveBeenCalledWith('update');
  });

  it('reports plant-not-found when the plant is missing or not owned', async () => {
    const subWhere = vi.fn().mockReturnValue([]);
    const subFrom = vi.fn().mockReturnValue({ where: subWhere });

    const plantWhere = vi.fn().mockResolvedValue([]);
    const plantFrom = vi.fn().mockReturnValue({ where: plantWhere });

    const tx = {
      select: vi
        .fn()
        .mockImplementationOnce(() => ({ from: subFrom }))
        .mockImplementationOnce(() => ({ from: plantFrom })),
      update: vi.fn(),
    };
    const transaction = vi.fn((callback) => callback(tx));
    const repo = makeRepo({ transaction });

    await expect(repo.updateWithCapacity('user-1', 'plant-1', {})).resolves.toEqual({
      ok: false,
      reason: 'plant-not-found',
    });
    expect(tx.update).not.toHaveBeenCalled();
  });

  it('updates a plant directly when the surface area is not changing', async () => {
    const subWhere = vi.fn().mockReturnValue([]);
    const subFrom = vi.fn().mockReturnValue({ where: subWhere });

    const plantWhere = vi.fn().mockResolvedValue([plant]);
    const plantFrom = vi.fn().mockReturnValue({ where: plantWhere });

    const returning = vi.fn().mockResolvedValue([{ ...plant, plantName: 'Cherry Tomato' }]);
    const where = vi.fn().mockReturnValue({ returning });
    const set = vi.fn().mockReturnValue({ where });
    const update = vi.fn().mockReturnValue({ set });

    const tx = {
      select: vi
        .fn()
        .mockImplementationOnce(() => ({ from: subFrom }))
        .mockImplementationOnce(() => ({ from: plantFrom })),
      update,
    };
    const transaction = vi.fn((callback) => callback(tx));
    const repo = makeRepo({ transaction });

    const result = await repo.updateWithCapacity('user-1', 'plant-1', {
      plantName: 'Cherry Tomato',
    });
    expect(result).toMatchObject({ ok: true });
    // No garden lock or sum is taken when the surface area is unchanged.
    expect(set).toHaveBeenCalledWith({ plantName: 'Cherry Tomato' });
    expect(tx.select).toHaveBeenCalledTimes(2);
  });
});
