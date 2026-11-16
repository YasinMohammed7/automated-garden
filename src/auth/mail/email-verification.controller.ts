import { BadRequestException, Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CurrentUser, EmailVerificationService, Public } from '@nestjs/authentication';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { User } from '../../users/users.schema.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';

@ApiTags('email-verification')
@Controller('auth/email-verification')
export class EmailVerificationController {
  constructor(private readonly emailVerification: EmailVerificationService) {}

  @Throttle({ auth: { limit: 5, ttl: 3_600_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('send')
  @ApiOperation({ summary: 'Send a verification email to the current user' })
  @ApiOkResponse({ description: 'Verification link generated (logged in development)' })
  @ApiUnauthorizedResponse({ description: 'Not signed in' })
  send(@CurrentUser() user: User) {
    return this.emailVerification.send({ id: user.userId, email: user.emailAddress });
  }

  @Throttle({ auth: { limit: 10, ttl: 900_000 } })
  @HttpCode(HttpStatus.OK)
  @Public()
  @Post('verify')
  @ApiOperation({ summary: 'Verify an email address using a token' })
  @ApiOkResponse({ description: 'Email marked as verified' })
  @ApiBadRequestResponse({ description: 'Invalid, expired, or already used token' })
  async verify(@Body() dto: VerifyEmailDto) {
    const result = await this.emailVerification.verify(dto.token);
    if (!result) {
      throw new BadRequestException('Invalid or expired token');
    }
    return result;
  }
}
