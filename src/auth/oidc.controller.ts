import { Controller, Get, Param, Query, Redirect } from '@nestjs/common';
import { OidcService, Public } from '@nestjs/authentication';
import {
  ApiForbiddenResponse,
  ApiFoundResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

@ApiTags('auth')
@Public()
@Controller('auth/oidc')
export class OidcController {
  constructor(private readonly oidc: OidcService) {}

  @Throttle({ auth: { limit: 10, ttl: 60_000 } })
  @Get(':provider/login')
  @Redirect()
  @ApiOperation({
    summary: 'Start OIDC login',
    description: 'Redirects the browser to the provider authorization URL.',
  })
  @ApiParam({ name: 'provider', type: String, description: 'Provider name, e.g. google' })
  @ApiQuery({
    name: 'redirectTo',
    required: false,
    type: String,
    description: 'Relative path to land on after sign-in',
  })
  @ApiQuery({
    name: 'link',
    required: false,
    type: String,
    description: 'Set to "true" to link the provider to the signed-in user',
  })
  @ApiFoundResponse({ description: 'Redirect to the provider authorization URL' })
  @ApiNotFoundResponse({ description: 'Unknown provider' })
  login(
    @Param('provider') provider: string,
    @Query('redirectTo') redirectTo?: string,
    @Query('link') link?: string,
  ) {
    return this.oidc.start(provider, { redirectTo, link: link === 'true' });
  }

  @Get(':provider/callback')
  @Redirect()
  @ApiOperation({ summary: 'Complete OIDC login' })
  @ApiParam({ name: 'provider', type: String })
  @ApiFoundResponse({ description: 'Redirect after sign-in' })
  @ApiNotFoundResponse({ description: 'Unknown provider' })
  @ApiForbiddenResponse({ description: 'Account not allowed or not linked' })
  callback(@Param('provider') provider: string, @Query() query: Record<string, string>) {
    return this.oidc.finish(provider, query);
  }
}
