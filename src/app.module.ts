import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthenticationModule, google } from '@nestjs/authentication';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DrizzleModule } from '@nestjs/drizzle';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { drizzle } from 'drizzle-orm/node-postgres';
import { relations } from './database/database.js';
import { UsersModule } from './users/users.module.js';
import { AuthModule } from './auth/auth.module.js';
import { HealthModule } from './health/health.module.js';
import { GardenModule } from './garden/garden.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      { name: 'default', ttl: 60_000, limit: 60 },
      { name: 'auth', ttl: 60_000, limit: 10 },
    ]),
    AuthenticationModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        oidc: {
          callbackUrl: `${config.getOrThrow<string>('APP_URL')}/api/auth/oidc/:provider/callback`,
          providers: {
            google: {
              ...google({
                clientId: config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
                clientSecret: config.getOrThrow<string>('GOOGLE_CLIENT_SECRET'),
              }),
              authorizationParams: { prompt: 'select_account' },
            },
          },
        },
        emailVerification: {
          // The frontend page that receives ?token=… and POSTs it back.
          url: `${config.getOrThrow<string>('APP_URL')}/verify-email`,
        },
      }),
    }),
    DrizzleModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        drizzle,
        connection: config.getOrThrow<string>('DATABASE_URL'),
        relations,
      }),
    }),
    UsersModule,
    AuthModule,
    HealthModule,
    GardenModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
