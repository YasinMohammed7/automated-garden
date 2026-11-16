import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Patch } from '@nestjs/common';
import { CurrentUser, SignInService } from '@nestjs/authentication';
import {
  ApiBadRequestResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { UsersService } from './users.service.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import type { User } from './users.schema.js';

@ApiTags('users')
@Controller('users')
@ApiUnauthorizedResponse({ description: 'Not signed in' })
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly signIn: SignInService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the current user profile' })
  @ApiOkResponse({ description: 'Profile returned' })
  getProfile(@CurrentUser() user: User) {
    return this.usersService.findProfile(user.userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update the current user profile' })
  @ApiOkResponse({ description: 'Profile updated' })
  @ApiBadRequestResponse({ description: 'Invalid payload' })
  updateProfile(@CurrentUser() user: User, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.updateProfile(user.userId, updateUserDto);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete the current user account' })
  @ApiNoContentResponse({ description: 'Account deleted' })
  @ApiNotFoundResponse({ description: 'User not found' })
  async removeMe(@CurrentUser() user: User) {
    await this.usersService.deleteProfile(user.userId);
    await this.signIn.signOutEverywhere(user.userId);
  }
}
