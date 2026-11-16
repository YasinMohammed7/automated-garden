import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import type { User } from '../users/users.schema.js';
import type { Garden } from './garden.schema.js';
import { GardenService } from './garden.service.js';
import { GardenController } from './garden.controller.js';
import type { CreateGardenDto } from './dto/create-garden.dto.js';
import type { UpdateGardenDto } from './dto/update-garden.dto.js';

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

const garden: Garden = {
  gardenId: 'garden-1',
  gardenName: 'Backyard',
  totalSurfaceArea: 12.5,
  locationDescription: 'Patio',
  userId: 'user-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

function serviceMock() {
  return {
    findAll: vi.fn<(userId: string) => Promise<Garden[]>>(),
    findOne: vi.fn<(userId: string, gardenId: string) => Promise<Garden>>(),
    create: vi.fn<(userId: string, dto: CreateGardenDto) => Promise<Garden>>(),
    update: vi.fn<(userId: string, gardenId: string, dto: UpdateGardenDto) => Promise<Garden>>(),
    remove: vi.fn<(userId: string, gardenId: string) => Promise<void>>(),
  };
}

async function createController(service: ReturnType<typeof serviceMock>) {
  const module = await Test.createTestingModule({
    controllers: [GardenController],
    providers: [{ provide: GardenService, useValue: service }],
  }).compile();

  return module.get(GardenController);
}

describe('GardenController', () => {
  it('creates a garden for the current user', async () => {
    const service = serviceMock();
    service.create.mockResolvedValue(garden);
    const dto: CreateGardenDto = { gardenName: 'Backyard', totalSurfaceArea: 12.5 };
    const controller = await createController(service);

    await expect(controller.create(user, dto)).resolves.toBe(garden);
    expect(service.create).toHaveBeenCalledWith('user-1', dto);
  });

  it('lists the current user gardens', async () => {
    const service = serviceMock();
    service.findAll.mockResolvedValue([garden]);
    const controller = await createController(service);

    await expect(controller.findAll(user)).resolves.toEqual([garden]);
    expect(service.findAll).toHaveBeenCalledWith('user-1');
  });

  it('gets one garden', async () => {
    const service = serviceMock();
    service.findOne.mockResolvedValue(garden);
    const controller = await createController(service);

    await expect(controller.findOne(user, 'garden-1')).resolves.toBe(garden);
    expect(service.findOne).toHaveBeenCalledWith('user-1', 'garden-1');
  });

  it('updates a garden', async () => {
    const service = serviceMock();
    service.update.mockResolvedValue(garden);
    const dto: UpdateGardenDto = { gardenName: 'Front Yard' };
    const controller = await createController(service);

    await expect(controller.update(user, 'garden-1', dto)).resolves.toBe(garden);
    expect(service.update).toHaveBeenCalledWith('user-1', 'garden-1', dto);
  });

  it('removes a garden', async () => {
    const service = serviceMock();
    service.remove.mockResolvedValue(undefined);
    const controller = await createController(service);

    await controller.remove(user, 'garden-1');
    expect(service.remove).toHaveBeenCalledWith('user-1', 'garden-1');
  });
});
