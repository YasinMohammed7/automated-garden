import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { AuthenticationStorage } from '@nestjs/authentication';
import type { MfaState, SessionRecord, SessionStore } from '@nestjs/authentication';
import { and, eq, lt } from 'drizzle-orm';
import type { Database } from '../../database/database.js';
import { sessions } from './session.schema.js';
import type { Session } from './session.schema.js';

function toRecord(row: Session): SessionRecord {
  const record: SessionRecord = {
    id: row.id,
    userId: row.userId,
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    lastActiveAt: row.lastActiveAt,
  };
  if (row.mfa != null) {
    record.mfa = row.mfa as MfaState;
  }
  if (row.metadata != null) {
    record.metadata = row.metadata;
  }
  return record;
}

@Injectable()
export class DrizzleSessionStore implements SessionStore {
  constructor(
    @InjectDrizzle() private readonly db: Database,
    storage: AuthenticationStorage,
  ) {
    storage.registerSource({ sessions: this });
  }

  async getSession(id: string): Promise<SessionRecord | undefined> {
    const rows = await this.db.select().from(sessions).where(eq(sessions.id, id));
    const row = rows[0];
    return row ? toRecord(row) : undefined;
  }

  async createSession(record: SessionRecord): Promise<void> {
    // Drop sessions past their absolute expiry, so the table stays bounded.
    await this.db.delete(sessions).where(lt(sessions.expiresAt, record.lastActiveAt));
    await this.db.insert(sessions).values({
      id: record.id,
      userId: record.userId,
      createdAt: record.createdAt,
      expiresAt: record.expiresAt,
      lastActiveAt: record.lastActiveAt,
      mfa: record.mfa ?? null,
      metadata: record.metadata ?? null,
    });
  }

  async touchSession(id: string, lastActiveAt: Date): Promise<void> {
    await this.db
      .update(sessions)
      .set({ lastActiveAt })
      .where(and(eq(sessions.id, id), lt(sessions.lastActiveAt, lastActiveAt)));
  }

  async deleteSession(id: string): Promise<boolean> {
    const rows = await this.db
      .delete(sessions)
      .where(eq(sessions.id, id))
      .returning({ id: sessions.id });
    return rows.length > 0;
  }

  async listUserSessions(userId: string): Promise<SessionRecord[]> {
    const rows = await this.db.select().from(sessions).where(eq(sessions.userId, userId));
    return rows.map(toRecord);
  }

  async deleteUserSessions(userId: string): Promise<void> {
    await this.db.delete(sessions).where(eq(sessions.userId, userId));
  }
}
