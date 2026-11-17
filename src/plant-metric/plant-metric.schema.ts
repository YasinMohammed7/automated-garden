import { sql } from 'drizzle-orm';
import { check, pgTable, smallint, timestamp, uuid } from 'drizzle-orm/pg-core';
import { plants } from '../plant/plant.schema.js';

export const realtimePlantMetrics = pgTable(
  'realtime_plant_metrics',
  {
    plantId: uuid('plant_id')
      .primaryKey()
      .references(() => plants.plantId, { onDelete: 'cascade' }),

    currentHumidityLevel: smallint('current_humidity_level').notNull(),

    lastIrrigationStartTime: timestamp('last_irrigation_start_time', {
      withTimezone: true,
      mode: 'date',
    }),

    lastIrrigationEndTime: timestamp('last_irrigation_end_time', {
      withTimezone: true,
      mode: 'date',
    }),

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
    check(
      'realtime_plant_metrics_current_humidity_level_range',
      sql`${table.currentHumidityLevel} >= 0 and ${table.currentHumidityLevel} <= 100`,
    ),
  ],
);

export type RealtimePlantMetric = typeof realtimePlantMetrics.$inferSelect;
export type NewRealtimePlantMetric = typeof realtimePlantMetrics.$inferInsert;
