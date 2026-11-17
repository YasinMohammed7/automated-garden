import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { CreatePlantDto } from './dto/create-plant.dto.js';
import { PlantResponseDto } from './dto/plant-response.dto.js';
import { UpdatePlantDto } from './dto/update-plant.dto.js';
import { PlantsRepository } from './plant.repository.js';

@Injectable()
export class PlantService {
  constructor(private readonly plantsRepository: PlantsRepository) {}

  async findAll(userId: string): Promise<PlantResponseDto[]> {
    const plants = await this.plantsRepository.findByUser(userId);

    return plainToInstance(PlantResponseDto, plants);
  }

  async findByGarden(userId: string, gardenId: string): Promise<PlantResponseDto[]> {
    const plants = await this.plantsRepository.findByGarden(userId, gardenId);

    if (!plants) {
      throw new NotFoundException('Garden not found');
    }

    return plainToInstance(PlantResponseDto, plants);
  }

  async findOne(userId: string, plantId: string): Promise<PlantResponseDto> {
    const plant = await this.plantsRepository.findById(userId, plantId);

    if (!plant) {
      throw new NotFoundException('Plant not found');
    }

    return plainToInstance(PlantResponseDto, plant);
  }

  async create(
    userId: string,
    gardenId: string,
    createPlantDto: CreatePlantDto,
  ): Promise<PlantResponseDto> {
    const result = await this.plantsRepository.createWithCapacity(userId, gardenId, createPlantDto);

    if (!result.ok) {
      if (result.reason === 'garden-not-found') {
        throw new NotFoundException('Garden not found');
      }
      throw new ConflictException(
        `Garden is overcrowded: ${result.requiredArea} m² required but only ${result.availableArea} m² available`,
      );
    }

    return plainToInstance(PlantResponseDto, result.plant);
  }

  async update(
    userId: string,
    plantId: string,
    updatePlantDto: UpdatePlantDto,
  ): Promise<PlantResponseDto> {
    const result = await this.plantsRepository.updateWithCapacity(userId, plantId, updatePlantDto);

    if (!result.ok) {
      if (result.reason === 'plant-not-found') {
        throw new NotFoundException('Plant not found');
      }
      if (result.reason === 'garden-not-found') {
        throw new NotFoundException('Garden not found');
      }
      throw new ConflictException(
        `Garden is overcrowded: ${result.requiredArea} m² required but only ${result.availableArea} m² available`,
      );
    }

    return plainToInstance(PlantResponseDto, result.plant);
  }

  async remove(userId: string, plantId: string): Promise<void> {
    const deleted = await this.plantsRepository.delete(userId, plantId);

    if (!deleted) {
      throw new NotFoundException('Plant not found');
    }
  }
}
