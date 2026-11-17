import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import { CurrentUser } from '@nestjs/authentication';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { PlantService } from './plant.service.js';
import { UpdatePlantDto } from './dto/update-plant.dto.js';
import type { User } from '../users/users.schema.js';

@ApiTags('plants')
@Controller('plants')
@ApiUnauthorizedResponse({ description: 'Not signed in' })
export class PlantController {
  constructor(private readonly plantService: PlantService) {}

  @Get()
  @ApiOperation({ summary: 'List all plants of the current user' })
  @ApiOkResponse({ description: 'Plants returned' })
  findAll(@CurrentUser() user: User) {
    return this.plantService.findAll(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: "Get one of the current user's plants" })
  @ApiParam({ name: 'id', type: String, description: 'Plant ID (UUID)' })
  @ApiOkResponse({ description: 'Plant returned' })
  @ApiNotFoundResponse({ description: 'Plant not found' })
  findOne(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.plantService.findOne(user.userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a plant' })
  @ApiParam({ name: 'id', type: String, description: 'Plant ID (UUID)' })
  @ApiOkResponse({ description: 'Plant updated' })
  @ApiBadRequestResponse({ description: 'Invalid payload' })
  @ApiNotFoundResponse({ description: 'Plant not found' })
  @ApiConflictResponse({ description: 'Not enough surface area in the garden' })
  update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePlantDto: UpdatePlantDto,
  ) {
    return this.plantService.update(user.userId, id, updatePlantDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a plant' })
  @ApiParam({ name: 'id', type: String, description: 'Plant ID (UUID)' })
  @ApiOkResponse({ description: 'Plant deleted' })
  @ApiNotFoundResponse({ description: 'Plant not found' })
  remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.plantService.remove(user.userId, id);
  }
}
