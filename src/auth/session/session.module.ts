import { Module } from '@nestjs/common';
import { UsersModule } from '../../users/users.module.js';
import { DrizzleSessionStore } from './drizzle-session.store.js';
import { SessionAuth } from './session-auth.js';

@Module({
  imports: [UsersModule],
  providers: [SessionAuth, DrizzleSessionStore],
  exports: [SessionAuth],
})
export class SessionModule {}
