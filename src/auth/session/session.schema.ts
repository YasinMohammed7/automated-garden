import { index, jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from '../../users/users.schema.js';

export const sessions = pgTable(
  'sessions',
  {
    /** SHA-256 of the cookie token; the token itself is never stored. */
    id: varchar('id', { length: 64 }).primaryKey(),

    userId: uuid('user_id')
      .notNull()
      .references(() => users.userId, { onDelete: 'cascade' }),

    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),

    expiresAt: timestamp('expires_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),

    lastActiveAt: timestamp('last_active_at', {
      withTimezone: true,
      mode: 'date',
    }).notNull(),

    mfa: jsonb('mfa').$type<'pending' | 'verified'>(),

    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  },
  (table) => [
    index('sessions_user_id_idx').on(table.userId),
    index('sessions_expires_at_idx').on(table.expiresAt),
  ],
);

export type Session = typeof sessions.$inferSelect;
