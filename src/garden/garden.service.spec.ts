import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { GardensRepository } from './garden.repository.js';
import type { Garden } from './garden.schema.js';
import { GardenService } from './garden.service.js';
import type { CreateGardenDto } from './dto/create-garden.dto.js';
import type { UpdateGardenDto } from './dto/update-garden.dto.js';

const garden: Garden = {
  gardenId: 'garden-1',
  gardenName: 'Backyard',
  totalSurfaceArea: 12.5,
  locationDescription: 'Patio',
  userId: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

function repoMock() {
  return {
    findByUser: vi.fn<(userId: string) => Promise<Garden[]>>(),
    findById: vi.fn<(userId: string, gardenId: string) => Promise<Garden | undefined>>(),
    create: vi.fn<(userId: string, data: CreateGardenDto) => Promise<Garden>>(),
    update:
      vi.fn<
        (userId: string, gardenId: string, data: UpdateGardenDto) => Promise<Garden | undefined>
      >(),
    delete: vi.fn<(userId: string, gardenId: string) => Promise<boolean>>(),
  };
}

async function createService(repo: ReturnType<typeof repoMock>) {
  const module = await Test.createTestingModule({
    providers: [GardenService, { provide: GardensRepository, useValue: repo }],
  }).compile();

  return module.get(GardenService);
}

describe('GardenService', () => {
  it('lists the gardens of a user', async () => {
    const repo = repoMock();
    repo.findByUser.mockResolvedValue([garden]);
    const service = await createService(repo);

    const result = await service.findAll('user-1');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      gardenId: 'garden-1',
      gardenName: 'Backyard',
      totalSurfaceArea: 12.5,
      locationDescription: 'Patio',
    });
    expect(result[0]).not.toHaveProperty('userId');
    expect(repo.findByUser).toHaveBeenCalledWith('user-1');
  });

  it('returns a garden owned by the user', async () => {
    const repo = repoMock();
    repo.findById.mockResolvedValue(garden);
    const service = await createService(repo);

    const result = await service.findOne('user-1', 'garden-1');
    expect(result).toMatchObject({
      gardenId: 'garden-1',
      gardenName: 'Backyard',
      totalSurfaceArea: 12.5,
      locationDescription: 'Patio',
    });
    expect(result).not.toHaveProperty('userId');
    expect(repo.findById).toHaveBeenCalledWith('user-1', 'garden-1');
  });

  it('throws when a garden does not exist', async () => {
    const repo = repoMock();
    repo.findById.mockResolvedValue(undefined);
    const service = await createService(repo);

    await expect(service.findOne('user-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates a garden for the user', async () => {
    const repo = repoMock();
    repo.create.mockResolvedValue(garden);
    const dto: CreateGardenDto = { gardenName: 'Backyard', totalSurfaceArea: 12.5 };
    const service = await createService(repo);

    const result = await service.create('user-1', dto);
    expect(result).toMatchObject({ gardenName: 'Backyard', totalSurfaceArea: 12.5 });
    expect(result).not.toHaveProperty('userId');
    expect(repo.create).toHaveBeenCalledWith('user-1', dto);
  });

  it('updates a garden owned by the user', async () => {
    const repo = repoMock();
    repo.update.mockResolvedValue({ ...garden, gardenName: 'Front Yard' });
    const dto: UpdateGardenDto = { gardenName: 'Front Yard' };
    const service = await createService(repo);

    const result = await service.update('user-1', 'garden-1', dto);
    expect(result).toMatchObject({ gardenName: 'Front Yard' });
    expect(result).not.toHaveProperty('userId');
    expect(repo.update).toHaveBeenCalledWith('user-1', 'garden-1', dto);
  });

  it('throws when updating a missing garden', async () => {
    const repo = repoMock();
    repo.update.mockResolvedValue(undefined);
    const service = await createService(repo);

    await expect(service.update('user-1', 'missing', {})).rejects.toBeInstanceOf(NotFoundException);
  });

  it('removes a garden owned by the user', async () => {
    const repo = repoMock();
    repo.delete.mockResolvedValue(true);
    const service = await createService(repo);

    await expect(service.remove('user-1', 'garden-1')).resolves.toBeUndefined();
    expect(repo.delete).toHaveBeenCalledWith('user-1', 'garden-1');
  });

  it('throws when deleting a missing garden', async () => {
    const repo = repoMock();
    repo.delete.mockResolvedValue(false);
    const service = await createService(repo);

    await expect(service.remove('user-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
