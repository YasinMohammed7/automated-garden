import { Module } from '@nestjs/common';
import { GardenService } from './garden.service.js';
import { GardenController } from './garden.controller.js';
import { GardensRepository } from './garden.repository.js';

@Module({
  controllers: [GardenController],
  providers: [GardenService, GardensRepository],
})
export class GardenModule {}
