import { sql } from 'drizzle-orm';
import {
  check,
  doublePrecision,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from '../users/users.schema.js';

export const gardens = pgTable(
  'gardens',
  {
    gardenId: uuid('garden_id').defaultRandom().primaryKey(),

    gardenName: varchar('garden_name', { length: 100 }).notNull(),

    totalSurfaceArea: doublePrecision('total_surface_area').notNull(),

    locationDescription: text('location_description'),

    userId: uuid('user_id')
      .notNull()
      .references(() => users.userId, { onDelete: 'cascade' }),

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
    check('gardens_name_not_blank', sql`char_length(btrim(${table.gardenName})) >= 1`),
    check('gardens_total_surface_area_non_negative', sql`${table.totalSurfaceArea} >= 0`),
  ],
);

export type Garden = typeof gardens.$inferSelect;
export type NewGarden = typeof gardens.$inferInsert;
