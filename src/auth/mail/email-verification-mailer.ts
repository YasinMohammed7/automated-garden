import { Injectable, Logger } from '@nestjs/common';
import { AuthenticationRegistry, EmailVerificationHandler } from '@nestjs/authentication';
import type { EmailVerificationLink } from '@nestjs/authentication';
import { UsersRepository } from '../../users/users.repository.js';

@Injectable()
export class EmailVerificationMailer extends EmailVerificationHandler {
  private readonly logger = new Logger(EmailVerificationMailer.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    registry: AuthenticationRegistry,
  ) {
    super();
    registry.registerHandler('emailVerification', this);
  }

  send(link: EmailVerificationLink): void {
    // No mailer is configured yet: log the link instead of sending an email.
    this.logger.log(`Verification link for ${link.email}: ${link.url}`);
  }

  markVerified(userId: string, email: string): Promise<boolean> {
    return this.usersRepository.markEmailVerified(userId, email);
  }
}
