import { Module } from '@nestjs/common';
import { PlantService } from './plant.service.js';
import { PlantController } from './plant.controller.js';
import { GardenPlantsController } from './garden-plants.controller.js';
import { PlantsRepository } from './plant.repository.js';

@Module({
  controllers: [PlantController, GardenPlantsController],
  providers: [PlantService, PlantsRepository],
})
export class PlantModule {}
