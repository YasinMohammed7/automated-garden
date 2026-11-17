import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpException,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { CurrentUser, EmailVerificationService, Public } from '@nestjs/authentication';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { User } from '../../users/users.schema.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { EmailVerificationMailer } from './email-verification-mailer.js';

@ApiTags('email-verification')
@Controller('auth/email-verification')
export class EmailVerificationController {
  constructor(
    private readonly emailVerification: EmailVerificationService,
    private readonly mailer: EmailVerificationMailer,
  ) {}

  @Throttle({ auth: { limit: 5, ttl: 3_600_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('send')
  @ApiOperation({ summary: 'Send a verification code to the current user' })
  @ApiOkResponse({ description: 'Verification code generated (logged in development)' })
  @ApiTooManyRequestsResponse({ description: 'A code was sent too recently' })
  @ApiUnauthorizedResponse({ description: 'Not signed in' })
  async send(@CurrentUser() user: User) {
    const wait = this.mailer.resendCooldownSeconds(user.userId);
    if (wait > 0) {
      throw new HttpException(
        `Please wait ${wait} seconds before requesting another code`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    this.mailer.markSent(user.userId);
    return this.emailVerification.send({ id: user.userId, email: user.emailAddress });
  }

  @Throttle({ auth: { limit: 10, ttl: 900_000 } })
  @HttpCode(HttpStatus.OK)
  @Public()
  @Post('verify')
  @ApiOperation({ summary: 'Verify an email address using a 6-digit code' })
  @ApiOkResponse({ description: 'Email marked as verified' })
  @ApiBadRequestResponse({ description: 'Invalid, expired, or already used code' })
  async verify(@Body() dto: VerifyEmailDto) {
    const token = this.mailer.consumeCode(dto.code);
    if (!token) {
      throw new BadRequestException('Invalid or expired code');
    }
    const result = await this.emailVerification.verify(token);
    if (!result) {
      throw new BadRequestException('Invalid or expired code');
    }
    return result;
  }
}
