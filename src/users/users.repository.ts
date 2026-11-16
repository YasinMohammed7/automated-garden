import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { oidcIdentities } from '../auth/oidc-identities.schema.js';
import { users } from './users.schema.js';
import type { User } from './users.schema.js';

@Injectable()
export class UsersRepository {
  constructor(@InjectDrizzle() private readonly db: NodePgDatabase) {}

  async findById(userId: string): Promise<User | undefined> {
    const rows = await this.db.select().from(users).where(eq(users.userId, userId));
    return rows[0];
  }

  async findByEmail(email: string): Promise<User | undefined> {
    const rows = await this.db.select().from(users).where(eq(users.emailAddress, email));
    return rows[0];
  }

  async create(email: string, options: { emailVerified: boolean }): Promise<User> {
    const rows = await this.db
      .insert(users)
      .values({ emailAddress: email, emailVerified: options.emailVerified })
      .returning();
    const user = rows[0];
    if (!user) {
      throw new Error('Failed to create user');
    }
    return user;
  }

  async findByIdentity(provider: string, subject: string): Promise<User | undefined> {
    const rows = await this.db
      .select({ userId: oidcIdentities.userId })
      .from(oidcIdentities)
      .where(and(eq(oidcIdentities.provider, provider), eq(oidcIdentities.subject, subject)));
    const identity = rows[0];
    return identity ? this.findById(identity.userId) : undefined;
  }

  async linkIdentity(userId: string, provider: string, subject: string): Promise<User | undefined> {
    await this.db
      .insert(oidcIdentities)
      .values({ provider, subject, userId })
      .onConflictDoNothing();
    return this.findById(userId);
  }

  async update(
    userId: string,
    data: Partial<Pick<User, 'firstName' | 'lastName' | 'age'>>,
  ): Promise<User | undefined> {
    const rows = await this.db.update(users).set(data).where(eq(users.userId, userId)).returning();
    return rows[0];
  }

  async delete(userId: string): Promise<boolean> {
    const rows = await this.db
      .delete(users)
      .where(eq(users.userId, userId))
      .returning({ userId: users.userId });
    return rows.length > 0;
  }

  async markEmailVerified(userId: string, email: string): Promise<boolean> {
    const rows = await this.db
      .update(users)
      .set({ emailVerified: true })
      .where(and(eq(users.userId, userId), eq(users.emailAddress, email)))
      .returning({ userId: users.userId });
    return rows.length > 0;
  }
}
