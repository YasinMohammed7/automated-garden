import { sql } from 'drizzle-orm';
import {
  check,
  date,
  doublePrecision,
  index,
  pgEnum,
  pgTable,
  smallint,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { gardens } from '../garden/garden.schema.js';

export const plantType = pgEnum('plant_type', ['vegetable', 'fruit', 'flower']);

export const plants = pgTable(
  'plants',
  {
    plantId: uuid('plant_id').defaultRandom().primaryKey(),

    plantName: varchar('plant_name', { length: 100 }).notNull(),

    species: varchar('species', { length: 100 }).notNull(),

    plantType: plantType('plant_type').notNull(),

    plantationDate: date('plantation_date').notNull(),

    surfaceAreaRequired: doublePrecision('surface_area_required').notNull(),

    idealHumidityLevel: smallint('ideal_humidity_level').notNull(),

    gardenId: uuid('garden_id')
      .notNull()
      .references(() => gardens.gardenId, { onDelete: 'cascade' }),

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
    check('plants_name_not_blank', sql`char_length(btrim(${table.plantName})) >= 1`),
    check('plants_species_not_blank', sql`char_length(btrim(${table.species})) >= 1`),
    check('plants_surface_area_required_non_negative', sql`${table.surfaceAreaRequired} >= 0`),
    check(
      'plants_ideal_humidity_level_range',
      sql`${table.idealHumidityLevel} >= 0 and ${table.idealHumidityLevel} <= 100`,
    ),
    index('plants_garden_id_idx').on(table.gardenId),
  ],
);

export type Plant = typeof plants.$inferSelect;
export type NewPlant = typeof plants.$inferInsert;
export type PlantType = (typeof plantType.enumValues)[number];
