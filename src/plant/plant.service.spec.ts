import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { PlantsRepository } from './plant.repository.js';
import type { CreatePlantResult, UpdatePlantResult } from './plant.repository.js';
import type { Plant } from './plant.schema.js';
import { PlantService } from './plant.service.js';
import type { CreatePlantDto } from './dto/create-plant.dto.js';
import type { UpdatePlantDto } from './dto/update-plant.dto.js';

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

const createDto: CreatePlantDto = {
  plantName: 'Tomato',
  species: 'Solanum lycopersicum',
  plantType: 'vegetable',
  plantationDate: '2026-05-01',
  surfaceAreaRequired: 1.5,
  idealHumidityLevel: 60,
};

function repoMock() {
  return {
    findByUser: vi.fn<(userId: string) => Promise<Plant[]>>(),
    findByGarden: vi.fn<(userId: string, gardenId: string) => Promise<Plant[] | undefined>>(),
    findById: vi.fn<(userId: string, plantId: string) => Promise<Plant | undefined>>(),
    createWithCapacity:
      vi.fn<
        (userId: string, gardenId: string, data: CreatePlantDto) => Promise<CreatePlantResult>
      >(),
    updateWithCapacity:
      vi.fn<
        (userId: string, plantId: string, data: UpdatePlantDto) => Promise<UpdatePlantResult>
      >(),
    delete: vi.fn<(userId: string, plantId: string) => Promise<boolean>>(),
  };
}

async function createService(repo: ReturnType<typeof repoMock>) {
  const module = await Test.createTestingModule({
    providers: [PlantService, { provide: PlantsRepository, useValue: repo }],
  }).compile();

  return module.get(PlantService);
}

describe('PlantService', () => {
  it('lists the plants of a user', async () => {
    const repo = repoMock();
    repo.findByUser.mockResolvedValue([plant]);
    const service = await createService(repo);

    const result = await service.findAll('user-1');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      plantId: 'plant-1',
      plantName: 'Tomato',
      species: 'Solanum lycopersicum',
      plantType: 'vegetable',
      plantationDate: '2026-05-01',
      surfaceAreaRequired: 1.5,
      idealHumidityLevel: 60,
      gardenId: 'garden-1',
    });
    expect(result[0]).not.toHaveProperty('userId');
    expect(repo.findByUser).toHaveBeenCalledWith('user-1');
  });

  it('lists the plants of a garden owned by the user', async () => {
    const repo = repoMock();
    repo.findByGarden.mockResolvedValue([plant]);
    const service = await createService(repo);

    const result = await service.findByGarden('user-1', 'garden-1');
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ plantId: 'plant-1', gardenId: 'garden-1' });
    expect(repo.findByGarden).toHaveBeenCalledWith('user-1', 'garden-1');
  });

  it('throws when listing the plants of a garden the user does not own', async () => {
    const repo = repoMock();
    repo.findByGarden.mockResolvedValue(undefined);
    const service = await createService(repo);

    await expect(service.findByGarden('user-1', 'someone-else-garden')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns a plant owned by the user', async () => {
    const repo = repoMock();
    repo.findById.mockResolvedValue(plant);
    const service = await createService(repo);

    const result = await service.findOne('user-1', 'plant-1');
    expect(result).toMatchObject({
      plantId: 'plant-1',
      plantName: 'Tomato',
      gardenId: 'garden-1',
    });
    expect(result).not.toHaveProperty('userId');
    expect(repo.findById).toHaveBeenCalledWith('user-1', 'plant-1');
  });

  it('throws when a plant does not exist', async () => {
    const repo = repoMock();
    repo.findById.mockResolvedValue(undefined);
    const service = await createService(repo);

    await expect(service.findOne('user-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('creates a plant in a garden owned by the user', async () => {
    const repo = repoMock();
    repo.createWithCapacity.mockResolvedValue({ ok: true, plant });
    const service = await createService(repo);

    const result = await service.create('user-1', 'garden-1', createDto);
    expect(result).toMatchObject({ plantName: 'Tomato', gardenId: 'garden-1' });
    expect(result).not.toHaveProperty('userId');
    expect(repo.createWithCapacity).toHaveBeenCalledWith('user-1', 'garden-1', createDto);
  });

  it('allows creating a plant that exactly fills the remaining surface area', async () => {
    const repo = repoMock();
    repo.createWithCapacity.mockResolvedValue({ ok: true, plant });
    const service = await createService(repo);

    await expect(service.create('user-1', 'garden-1', createDto)).resolves.toMatchObject({
      gardenId: 'garden-1',
    });
  });

  it('throws when creating a plant in a garden the user does not own', async () => {
    const repo = repoMock();
    repo.createWithCapacity.mockResolvedValue({ ok: false, reason: 'garden-not-found' });
    const service = await createService(repo);

    await expect(service.create('user-1', 'someone-else-garden', createDto)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects an overcrowded garden when creating a plant', async () => {
    const repo = repoMock();
    repo.createWithCapacity.mockResolvedValue({
      ok: false,
      reason: 'overcrowded',
      requiredArea: 1.5,
      availableArea: 0.5,
    });
    const service = await createService(repo);

    await expect(service.create('user-1', 'garden-1', createDto)).rejects.toBeInstanceOf(
      ConflictException,
    );
    await expect(service.create('user-1', 'garden-1', createDto)).rejects.toThrow(
      'Garden is overcrowded: 1.5 m² required but only 0.5 m² available',
    );
  });

  it('updates a plant owned by the user', async () => {
    const repo = repoMock();
    repo.updateWithCapacity.mockResolvedValue({
      ok: true,
      plant: { ...plant, plantName: 'Cherry Tomato' },
    });
    const dto: UpdatePlantDto = { plantName: 'Cherry Tomato' };
    const service = await createService(repo);

    const result = await service.update('user-1', 'plant-1', dto);
    expect(result).toMatchObject({ plantName: 'Cherry Tomato' });
    expect(result).not.toHaveProperty('userId');
    expect(repo.updateWithCapacity).toHaveBeenCalledWith('user-1', 'plant-1', dto);
  });

  it('updates a plant surface area that fits the garden', async () => {
    const repo = repoMock();
    repo.updateWithCapacity.mockResolvedValue({
      ok: true,
      plant: { ...plant, surfaceAreaRequired: 2 },
    });
    const dto: UpdatePlantDto = { surfaceAreaRequired: 2 };
    const service = await createService(repo);

    const result = await service.update('user-1', 'plant-1', dto);
    expect(result).toMatchObject({ surfaceAreaRequired: 2 });
    expect(repo.updateWithCapacity).toHaveBeenCalledWith('user-1', 'plant-1', dto);
  });

  it('rejects an overcrowded garden when updating a plant surface area', async () => {
    const repo = repoMock();
    repo.updateWithCapacity.mockResolvedValue({
      ok: false,
      reason: 'overcrowded',
      requiredArea: 5,
      availableArea: 2.5,
    });
    const dto: UpdatePlantDto = { surfaceAreaRequired: 5 };
    const service = await createService(repo);

    await expect(service.update('user-1', 'plant-1', dto)).rejects.toBeInstanceOf(
      ConflictException,
    );
    await expect(service.update('user-1', 'plant-1', dto)).rejects.toThrow(
      'Garden is overcrowded: 5 m² required but only 2.5 m² available',
    );
  });

  it('throws when updating a missing plant', async () => {
    const repo = repoMock();
    repo.updateWithCapacity.mockResolvedValue({ ok: false, reason: 'plant-not-found' });
    const service = await createService(repo);

    await expect(service.update('user-1', 'missing', {})).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws when updating a plant whose garden is gone', async () => {
    const repo = repoMock();
    repo.updateWithCapacity.mockResolvedValue({ ok: false, reason: 'garden-not-found' });
    const service = await createService(repo);

    await expect(
      service.update('user-1', 'plant-1', { surfaceAreaRequired: 2 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('removes a plant owned by the user', async () => {
    const repo = repoMock();
    repo.delete.mockResolvedValue(true);
    const service = await createService(repo);

    await expect(service.remove('user-1', 'plant-1')).resolves.toBeUndefined();
    expect(repo.delete).toHaveBeenCalledWith('user-1', 'plant-1');
  });

  it('throws when deleting a missing plant', async () => {
    const repo = repoMock();
    repo.delete.mockResolvedValue(false);
    const service = await createService(repo);

    await expect(service.remove('user-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
