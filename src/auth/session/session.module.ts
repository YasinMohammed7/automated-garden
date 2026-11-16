import { Module } from '@nestjs/common';
import { UsersModule } from '../../users/users.module.js';
import { SessionAuth } from './session-auth.js';

@Module({
  imports: [UsersModule],
  providers: [SessionAuth],
  exports: [SessionAuth],
})
export class SessionModule {}
