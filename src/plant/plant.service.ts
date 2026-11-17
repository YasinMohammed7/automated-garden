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
    const capacity = await this.plantsRepository.findCapacity(userId, gardenId);

    if (!capacity) {
      throw new NotFoundException('Garden not found');
    }

    this.assertCapacity(capacity, createPlantDto.surfaceAreaRequired);

    const plant = await this.plantsRepository.create({
      plantName: createPlantDto.plantName,
      species: createPlantDto.species,
      plantType: createPlantDto.plantType,
      plantationDate: createPlantDto.plantationDate,
      surfaceAreaRequired: createPlantDto.surfaceAreaRequired,
      idealHumidityLevel: createPlantDto.idealHumidityLevel,
      gardenId,
    });

    return plainToInstance(PlantResponseDto, plant);
  }

  async update(
    userId: string,
    plantId: string,
    updatePlantDto: UpdatePlantDto,
  ): Promise<PlantResponseDto> {
    const existing = await this.plantsRepository.findById(userId, plantId);

    if (!existing) {
      throw new NotFoundException('Plant not found');
    }

    if (updatePlantDto.surfaceAreaRequired !== undefined) {
      const capacity = await this.plantsRepository.findCapacity(
        userId,
        existing.gardenId,
        existing.plantId,
      );

      if (!capacity) {
        throw new NotFoundException('Garden not found');
      }

      this.assertCapacity(capacity, updatePlantDto.surfaceAreaRequired);
    }

    const plant = await this.plantsRepository.update(userId, plantId, updatePlantDto);

    if (!plant) {
      throw new NotFoundException('Plant not found');
    }

    return plainToInstance(PlantResponseDto, plant);
  }

  private assertCapacity(
    capacity: { totalSurfaceArea: number; usedSurfaceArea: number },
    additionalArea: number,
  ): void {
    const available = capacity.totalSurfaceArea - capacity.usedSurfaceArea;

    if (additionalArea > available) {
      throw new ConflictException(
        `Garden is overcrowded: ${additionalArea} m² required but only ${available} m² available`,
      );
    }
  }

  async remove(userId: string, plantId: string): Promise<void> {
    const deleted = await this.plantsRepository.delete(userId, plantId);

    if (!deleted) {
      throw new NotFoundException('Plant not found');
    }
  }
}
