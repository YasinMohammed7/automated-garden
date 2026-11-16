import { Injectable } from '@nestjs/common';
import { AuthenticationRegistry, SessionCookieProvider } from '@nestjs/authentication';
import type { SessionRecord } from '@nestjs/authentication';
import { UsersRepository } from '../../users/users.repository.js';
import type { User } from '../../users/users.schema.js';

@Injectable()
export class SessionAuth extends SessionCookieProvider<User> {
  constructor(
    private readonly usersRepository: UsersRepository,
    registry: AuthenticationRegistry,
  ) {
    super();
    registry.registerProvider(this);
  }

  validate(session: SessionRecord): Promise<User | undefined> {
    return this.usersRepository.findById(session.userId);
  }
}
