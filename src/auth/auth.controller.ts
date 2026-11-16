import { Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { SignInService } from '@nestjs/authentication';
import {
  ApiNoContentResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly signIn: SignInService) {}

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  @ApiOperation({ summary: 'Sign out the current session' })
  @ApiNoContentResponse({ description: 'Session ended and cookie cleared' })
  @ApiUnauthorizedResponse({ description: 'Not signed in' })
  async logout() {
    await this.signIn.signOut();
  }
}
