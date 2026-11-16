import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './auth.controller.js';
import { GoogleOidcAccountResolver } from './google-oidc-account-resolver.js';
import { OidcController } from './oidc.controller.js';
import { MailModule } from './mail/mail.module.js';
import { SessionModule } from './session/session.module.js';

@Module({
  imports: [UsersModule, MailModule, SessionModule],
  controllers: [AuthController, OidcController],
  providers: [GoogleOidcAccountResolver],
})
export class AuthModule {}
