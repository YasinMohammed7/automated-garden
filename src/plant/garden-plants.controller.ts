import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { CurrentUser } from '@nestjs/authentication';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { PlantService } from './plant.service.js';
import { CreatePlantDto } from './dto/create-plant.dto.js';
import type { User } from '../users/users.schema.js';

@ApiTags('plants')
@Controller('gardens/:gardenId/plants')
@ApiUnauthorizedResponse({ description: 'Not signed in' })
export class GardenPlantsController {
  constructor(private readonly plantService: PlantService) {}

  @Post()
  @ApiOperation({ summary: 'Add a plant to a garden' })
  @ApiParam({ name: 'gardenId', type: String, description: 'Garden ID (UUID)' })
  @ApiCreatedResponse({ description: 'Plant created' })
  @ApiBadRequestResponse({ description: 'Invalid payload' })
  @ApiNotFoundResponse({ description: 'Garden not found' })
  @ApiConflictResponse({ description: 'Not enough surface area in the garden' })
  create(
    @CurrentUser() user: User,
    @Param('gardenId', ParseUUIDPipe) gardenId: string,
    @Body() createPlantDto: CreatePlantDto,
  ) {
    return this.plantService.create(user.userId, gardenId, createPlantDto);
  }

  @Get()
  @ApiOperation({ summary: 'List the plants of a garden' })
  @ApiParam({ name: 'gardenId', type: String, description: 'Garden ID (UUID)' })
  @ApiOkResponse({ description: 'Plants returned' })
  @ApiNotFoundResponse({ description: 'Garden not found' })
  findAll(@CurrentUser() user: User, @Param('gardenId', ParseUUIDPipe) gardenId: string) {
    return this.plantService.findByGarden(user.userId, gardenId);
  }
}
