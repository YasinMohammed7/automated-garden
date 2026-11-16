import { sql } from 'drizzle-orm';
import { boolean, check, pgTable, smallint, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    userId: uuid('user_id').defaultRandom().primaryKey(),

    firstName: varchar('first_name', { length: 100 }),

    lastName: varchar('last_name', { length: 100 }),

    age: smallint('age'),

    emailAddress: varchar('email_address', { length: 254 }).notNull().unique(),

    emailVerified: boolean('email_verified').default(false).notNull(),

    createdAt: timestamp('created_at', {
      withTimezone: true,
      mode: 'date',
    })
      .defaultNow()
      .notNull(),

    updatedAt: timestamp('updated_at', {
      withTimezone: true,
      mode: 'date',
    })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    check('users_first_name_not_blank', sql`char_length(btrim(${table.firstName})) >= 1`),
    check('users_last_name_not_blank', sql`char_length(btrim(${table.lastName})) >= 1`),
    check('users_age_non_negative', sql`${table.age} >= 0`),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
