import { Injectable, Logger } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { AuthenticationRegistry, EmailVerificationHandler } from '@nestjs/authentication';
import type { EmailVerificationLink } from '@nestjs/authentication';
import { UsersRepository } from '../../users/users.repository.js';

@Injectable()
export class EmailVerificationMailer extends EmailVerificationHandler {
  private readonly logger = new Logger(EmailVerificationMailer.name);
  /**
   * Maps a 6-digit code to the library's 256-bit token. In-memory: a restart
   * drops pending codes, so the user asks for a new one. The token itself is
   * stored hashed by the library; only this delivery shortcut keeps it.
   */
  private readonly codes = new Map<string, { token: string; userId: string; expiresAt: Date }>();
  private readonly lastSentAt = new Map<string, number>();
  private static readonly RESEND_COOLDOWN_MS = 60_000;

  constructor(
    private readonly usersRepository: UsersRepository,
    registry: AuthenticationRegistry,
  ) {
    super();
    registry.registerHandler('emailVerification', this);
  }

  send(link: EmailVerificationLink): void {
    // No mailer is configured yet: log the 6-digit code instead of sending an email.
    const token = new URL(link.url).searchParams.get('token');
    if (!token) {
      this.logger.error(`No token in verification link for ${link.email}`);
      return;
    }
    const code = this.issueCode(link.userId, token, link.expiresAt);
    this.logger.log(`Verification code for ${link.email}: ${code}`);
  }

  /** Returns the library token for a code, consuming the code (single use). */
  consumeCode(code: string): string | undefined {
    this.sweep();
    const entry = this.codes.get(code);
    if (!entry) {
      return undefined;
    }
    this.codes.delete(code);
    if (entry.expiresAt.getTime() <= Date.now()) {
      return undefined;
    }
    return entry.token;
  }

  /** Seconds until the user may request another code; `0` when allowed now. */
  resendCooldownSeconds(userId: string, now = Date.now()): number {
    const last = this.lastSentAt.get(userId);
    if (last === undefined) {
      return 0;
    }
    const remaining = last + EmailVerificationMailer.RESEND_COOLDOWN_MS - now;
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
  }

  /** Records a successful send for the cooldown. */
  markSent(userId: string, now = Date.now()): void {
    this.lastSentAt.set(userId, now);
  }

  markVerified(userId: string, email: string): Promise<boolean> {
    return this.usersRepository.markEmailVerified(userId, email);
  }

  private issueCode(userId: string, token: string, expiresAt: Date): string {
    this.sweep();
    // Latest code wins: a new code for the user replaces any previous ones.
    for (const [existingCode, entry] of this.codes) {
      if (entry.userId === userId) {
        this.codes.delete(existingCode);
      }
    }
    let code: string;
    do {
      code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    } while (this.codes.has(code));
    this.codes.set(code, { token, userId, expiresAt });
    return code;
  }

  private sweep(): void {
    const now = Date.now();
    for (const [code, entry] of this.codes) {
      if (entry.expiresAt.getTime() <= now) {
        this.codes.delete(code);
      }
    }
  }
}
