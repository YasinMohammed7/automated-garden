import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import type { User } from '../users/users.schema.js';
import type { Plant } from './plant.schema.js';
import { PlantService } from './plant.service.js';
import { GardenPlantsController } from './garden-plants.controller.js';
import type { CreatePlantDto } from './dto/create-plant.dto.js';

const user: User = {
  userId: 'user-1',
  firstName: null,
  lastName: null,
  age: null,
  emailAddress: 'john.doe@example.com',
  emailVerified: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

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

function serviceMock() {
  return {
    create: vi.fn<(userId: string, gardenId: string, dto: CreatePlantDto) => Promise<Plant>>(),
    findByGarden: vi.fn<(userId: string, gardenId: string) => Promise<Plant[]>>(),
  };
}

async function createController(service: ReturnType<typeof serviceMock>) {
  const module = await Test.createTestingModule({
    controllers: [GardenPlantsController],
    providers: [{ provide: PlantService, useValue: service }],
  }).compile();

  return module.get(GardenPlantsController);
}

describe('GardenPlantsController', () => {
  it('adds a plant to a garden for the current user', async () => {
    const service = serviceMock();
    service.create.mockResolvedValue(plant);
    const dto: CreatePlantDto = {
      plantName: 'Tomato',
      species: 'Solanum lycopersicum',
      plantType: 'vegetable',
      plantationDate: '2026-05-01',
      surfaceAreaRequired: 1.5,
      idealHumidityLevel: 60,
    };
    const controller = await createController(service);

    await expect(controller.create(user, 'garden-1', dto)).resolves.toBe(plant);
    expect(service.create).toHaveBeenCalledWith('user-1', 'garden-1', dto);
  });

  it('lists the plants of a garden for the current user', async () => {
    const service = serviceMock();
    service.findByGarden.mockResolvedValue([plant]);
    const controller = await createController(service);

    await expect(controller.findAll(user, 'garden-1')).resolves.toEqual([plant]);
    expect(service.findByGarden).toHaveBeenCalledWith('user-1', 'garden-1');
  });
});
