import { Controller, Get } from '@nestjs/common';
import { Public } from '@nestjs/authentication';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { HealthService } from './health.service.js';

@ApiTags('health')
@Public()
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Check service health' })
  @ApiOkResponse({ description: 'Service, database, and authentication status' })
  async check() {
    const databaseUp = await this.healthService.checkDatabase();
    const googleConfigured = this.healthService.isGoogleConfigured();

    return {
      server: 'up',
      database: databaseUp ? 'connected' : 'disconnected',
      authentication: {
        google: googleConfigured ? 'connected' : 'not configured',
      },
    };
  }
}
