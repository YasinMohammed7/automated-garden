import { Injectable, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { CreateGardenDto } from './dto/create-garden.dto.js';
import { GardenResponseDto } from './dto/garden-response.dto.js';
import { UpdateGardenDto } from './dto/update-garden.dto.js';
import { GardensRepository } from './garden.repository.js';

@Injectable()
export class GardenService {
  constructor(private readonly gardensRepository: GardensRepository) {}

  async findAll(userId: string): Promise<GardenResponseDto[]> {
    const gardens = await this.gardensRepository.findByUser(userId);
    return plainToInstance(GardenResponseDto, gardens);
  }

  async findOne(userId: string, gardenId: string): Promise<GardenResponseDto> {
    const garden = await this.gardensRepository.findById(userId, gardenId);
    if (!garden) {
      throw new NotFoundException('Garden not found');
    }
    return plainToInstance(GardenResponseDto, garden);
  }

  async create(userId: string, createGardenDto: CreateGardenDto): Promise<GardenResponseDto> {
    const garden = await this.gardensRepository.create(userId, createGardenDto);
    return plainToInstance(GardenResponseDto, garden);
  }

  async update(
    userId: string,
    gardenId: string,
    updateGardenDto: UpdateGardenDto,
  ): Promise<GardenResponseDto> {
    const garden = await this.gardensRepository.update(userId, gardenId, updateGardenDto);
    if (!garden) {
      throw new NotFoundException('Garden not found');
    }
    return plainToInstance(GardenResponseDto, garden);
  }

  async remove(userId: string, gardenId: string): Promise<void> {
    const deleted = await this.gardensRepository.delete(userId, gardenId);
    if (!deleted) {
      throw new NotFoundException('Garden not found');
    }
  }
}
