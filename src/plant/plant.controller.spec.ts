import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import type { User } from '../users/users.schema.js';
import type { Plant } from './plant.schema.js';
import { PlantService } from './plant.service.js';
import { PlantController } from './plant.controller.js';
import type { UpdatePlantDto } from './dto/update-plant.dto.js';

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
    findAll: vi.fn<(userId: string) => Promise<Plant[]>>(),
    findOne: vi.fn<(userId: string, plantId: string) => Promise<Plant>>(),
    update: vi.fn<(userId: string, plantId: string, dto: UpdatePlantDto) => Promise<Plant>>(),
    remove: vi.fn<(userId: string, plantId: string) => Promise<void>>(),
  };
}

async function createController(service: ReturnType<typeof serviceMock>) {
  const module = await Test.createTestingModule({
    controllers: [PlantController],
    providers: [{ provide: PlantService, useValue: service }],
  }).compile();

  return module.get(PlantController);
}

describe('PlantController', () => {
  it('lists the current user plants', async () => {
    const service = serviceMock();
    service.findAll.mockResolvedValue([plant]);
    const controller = await createController(service);

    await expect(controller.findAll(user)).resolves.toEqual([plant]);
    expect(service.findAll).toHaveBeenCalledWith('user-1');
  });

  it('gets one plant', async () => {
    const service = serviceMock();
    service.findOne.mockResolvedValue(plant);
    const controller = await createController(service);

    await expect(controller.findOne(user, 'plant-1')).resolves.toBe(plant);
    expect(service.findOne).toHaveBeenCalledWith('user-1', 'plant-1');
  });

  it('updates a plant', async () => {
    const service = serviceMock();
    service.update.mockResolvedValue(plant);
    const dto: UpdatePlantDto = { plantName: 'Cherry Tomato' };
    const controller = await createController(service);

    await expect(controller.update(user, 'plant-1', dto)).resolves.toBe(plant);
    expect(service.update).toHaveBeenCalledWith('user-1', 'plant-1', dto);
  });

  it('removes a plant', async () => {
    const service = serviceMock();
    service.remove.mockResolvedValue(undefined);
    const controller = await createController(service);

    await controller.remove(user, 'plant-1');
    expect(service.remove).toHaveBeenCalledWith('user-1', 'plant-1');
  });
});
