import { ConflictException, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthenticationRegistry, OidcAccountResolver } from '@nestjs/authentication';
import type { OAuthTokens, OidcProfile, OidcResolveContext } from '@nestjs/authentication';
import { UsersRepository } from '../users/users.repository.js';

@Injectable()
export class GoogleOidcAccountResolver extends OidcAccountResolver {
  constructor(
    private readonly usersRepository: UsersRepository,
    registry: AuthenticationRegistry,
  ) {
    super();
    registry.registerHandler('oidc', this);
  }

  async resolveUser(
    profile: OidcProfile,
    _tokens: OAuthTokens,
    { linkTo }: OidcResolveContext,
  ): Promise<{ id: string } | null> {
    const linked = await this.usersRepository.findByIdentity(profile.provider, profile.subject);

    // "Connect Google" from the account page: link to the signed-in user.
    if (linkTo) {
      if (linked && linked.userId !== linkTo.id) {
        throw new ConflictException('This Google account already belongs to another user');
      }
      await this.usersRepository.linkIdentity(linkTo.id, profile.provider, profile.subject);
      return { id: linkTo.id };
    }

    // A returning Google account: sign in the user it is linked to.
    if (linked) {
      return { id: linked.userId };
    }

    // First visit. Trust only an address Google verified, or anyone could
    // claim any account.
    const email = profile.email?.trim().toLowerCase();
    if (!email || !profile.emailVerified) {
      throw new ForbiddenException('Email address is not verified by Google');
    }

    const existing = await this.usersRepository.findByEmail(email);
    // Link by email only if the account's owner proved the address to us too.
    if (existing && !existing.emailVerified) {
      throw new ForbiddenException('Sign in with your existing account, then connect Google');
    }

    if (!existing) {
      const user = await this.usersRepository.create(email, { emailVerified: true });
      await this.usersRepository.linkIdentity(user.userId, profile.provider, profile.subject);
      return { id: user.userId };
    }

    await this.usersRepository.linkIdentity(existing.userId, profile.provider, profile.subject);
    return { id: existing.userId };
  }
}
