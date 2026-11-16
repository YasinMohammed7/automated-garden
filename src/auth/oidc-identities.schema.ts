import { pgTable, primaryKey, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from '../users/users.schema.js';

export const oidcIdentities = pgTable(
  'oidc_identities',
  {
    provider: varchar('provider', { length: 50 }).notNull(),

    subject: varchar('subject', { length: 255 }).notNull(),

    userId: uuid('user_id')
      .notNull()
      .references(() => users.userId, { onDelete: 'cascade' }),

    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'date',
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.provider, table.subject] })],
);
