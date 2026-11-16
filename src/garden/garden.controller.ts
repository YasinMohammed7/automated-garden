import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '@nestjs/authentication';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { GardenService } from './garden.service.js';
import { CreateGardenDto } from './dto/create-garden.dto.js';
import { UpdateGardenDto } from './dto/update-garden.dto.js';
import type { User } from '../users/users.schema.js';

@ApiTags('gardens')
@Controller('gardens')
@ApiUnauthorizedResponse({ description: 'Not signed in' })
export class GardenController {
  constructor(private readonly gardenService: GardenService) {}

  @Post()
  @ApiOperation({ summary: 'Create a garden' })
  @ApiCreatedResponse({ description: 'Garden created' })
  @ApiBadRequestResponse({ description: 'Invalid payload' })
  create(@CurrentUser() user: User, @Body() createGardenDto: CreateGardenDto) {
    return this.gardenService.create(user.userId, createGardenDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all gardens of the current user' })
  @ApiOkResponse({ description: 'Gardens returned' })
  findAll(@CurrentUser() user: User) {
    return this.gardenService.findAll(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: "Get one of the current user's gardens" })
  @ApiParam({ name: 'id', type: String, description: 'Garden ID (UUID)' })
  @ApiOkResponse({ description: 'Garden returned' })
  @ApiNotFoundResponse({ description: 'Garden not found' })
  findOne(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.gardenService.findOne(user.userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a garden' })
  @ApiParam({ name: 'id', type: String, description: 'Garden ID (UUID)' })
  @ApiOkResponse({ description: 'Garden updated' })
  @ApiBadRequestResponse({ description: 'Invalid payload' })
  @ApiNotFoundResponse({ description: 'Garden not found' })
  update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateGardenDto: UpdateGardenDto,
  ) {
    return this.gardenService.update(user.userId, id, updateGardenDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a garden' })
  @ApiParam({ name: 'id', type: String, description: 'Garden ID (UUID)' })
  @ApiOkResponse({ description: 'Garden deleted' })
  @ApiNotFoundResponse({ description: 'Garden not found' })
  remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.gardenService.remove(user.userId, id);
  }
}
