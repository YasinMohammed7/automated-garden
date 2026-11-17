import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, eq, inArray, ne, sql } from 'drizzle-orm';
import type { Database } from '../database/database.js';
import { gardens } from '../garden/garden.schema.js';
import { plants } from './plant.schema.js';
import type { NewPlant, Plant } from './plant.schema.js';

type PlantInput = Pick<
  NewPlant,
  | 'plantName'
  | 'species'
  | 'plantType'
  | 'plantationDate'
  | 'surfaceAreaRequired'
  | 'idealHumidityLevel'
>;
type PlantUpdate = Partial<
  Pick<
    Plant,
    | 'plantName'
    | 'species'
    | 'plantType'
    | 'plantationDate'
    | 'surfaceAreaRequired'
    | 'idealHumidityLevel'
  >
>;

export type CreatePlantResult =
  | { ok: true; plant: Plant }
  | { ok: false; reason: 'garden-not-found' }
  | { ok: false; reason: 'overcrowded'; requiredArea: number; availableArea: number };

export type UpdatePlantResult =
  | { ok: true; plant: Plant }
  | { ok: false; reason: 'plant-not-found' }
  | { ok: false; reason: 'garden-not-found' }
  | { ok: false; reason: 'overcrowded'; requiredArea: number; availableArea: number };

@Injectable()
export class PlantsRepository {
  constructor(@InjectDrizzle() private readonly db: Database) {}

  async findByUser(userId: string): Promise<Plant[]> {
    const userGardenIds = this.db
      .select({ gardenId: gardens.gardenId })
      .from(gardens)
      .where(eq(gardens.userId, userId));

    return this.db.select().from(plants).where(inArray(plants.gardenId, userGardenIds));
  }

  async findByGarden(userId: string, gardenId: string): Promise<Plant[] | undefined> {
    const garden = await this.db.query.gardens.findFirst({
      where: { gardenId, userId },
      with: { plants: true },
    });
    return garden?.plants;
  }

  async createWithCapacity(
    userId: string,
    gardenId: string,
    data: PlantInput,
  ): Promise<CreatePlantResult> {
    return this.db.transaction(async (tx) => {
      // Lock the garden row so concurrent adds to the same garden serialize:
      // a second writer re-reads the sum only after the first one commits.
      const gardenRows = await tx
        .select()
        .from(gardens)
        .where(and(eq(gardens.gardenId, gardenId), eq(gardens.userId, userId)))
        .for('update');
      const garden = gardenRows[0];
      if (!garden) {
        return { ok: false, reason: 'garden-not-found' };
      }

      const sumRows = await tx
        .select({ total: sql<number>`coalesce(sum(${plants.surfaceAreaRequired}), 0)` })
        .from(plants)
        .where(eq(plants.gardenId, gardenId));
      const used = sumRows[0]?.total ?? 0;
      const availableArea = garden.totalSurfaceArea - used;
      if (data.surfaceAreaRequired > availableArea) {
        return {
          ok: false,
          reason: 'overcrowded',
          requiredArea: data.surfaceAreaRequired,
          availableArea,
        };
      }

      const rows = await tx
        .insert(plants)
        .values({ ...data, gardenId })
        .returning();
      const plant = rows[0];
      if (!plant) {
        throw new Error('Failed to create plant');
      }
      return { ok: true, plant };
    });
  }

  async findById(userId: string, plantId: string): Promise<Plant | undefined> {
    const userGardenIds = this.db
      .select({ gardenId: gardens.gardenId })
      .from(gardens)
      .where(eq(gardens.userId, userId));

    const rows = await this.db
      .select()
      .from(plants)
      .where(and(eq(plants.plantId, plantId), inArray(plants.gardenId, userGardenIds)));
    return rows[0];
  }

  async updateWithCapacity(
    userId: string,
    plantId: string,
    data: PlantUpdate,
  ): Promise<UpdatePlantResult> {
    return this.db.transaction(async (tx) => {
      const userGardenIds = tx
        .select({ gardenId: gardens.gardenId })
        .from(gardens)
        .where(eq(gardens.userId, userId));

      const plantRows = await tx
        .select()
        .from(plants)
        .where(and(eq(plants.plantId, plantId), inArray(plants.gardenId, userGardenIds)));
      const existing = plantRows[0];
      if (!existing) {
        return { ok: false, reason: 'plant-not-found' };
      }

      // No surface-area change: no capacity concern, update directly.
      if (data.surfaceAreaRequired === undefined) {
        const rows = await tx
          .update(plants)
          .set(data)
          .where(eq(plants.plantId, plantId))
          .returning();
        const plant = rows[0];
        if (!plant) {
          throw new Error('Failed to update plant');
        }
        return { ok: true, plant };
      }

      // Lock the garden row so a concurrent add/update on the same garden
      // serializes behind this transaction.
      const gardenRows = await tx
        .select()
        .from(gardens)
        .where(eq(gardens.gardenId, existing.gardenId))
        .for('update');
      const garden = gardenRows[0];
      if (!garden) {
        return { ok: false, reason: 'garden-not-found' };
      }

      const sumRows = await tx
        .select({ total: sql<number>`coalesce(sum(${plants.surfaceAreaRequired}), 0)` })
        .from(plants)
        .where(and(eq(plants.gardenId, existing.gardenId), ne(plants.plantId, plantId)));
      const used = sumRows[0]?.total ?? 0;
      const availableArea = garden.totalSurfaceArea - used;
      if (data.surfaceAreaRequired > availableArea) {
        return {
          ok: false,
          reason: 'overcrowded',
          requiredArea: data.surfaceAreaRequired,
          availableArea,
        };
      }

      const rows = await tx.update(plants).set(data).where(eq(plants.plantId, plantId)).returning();
      const plant = rows[0];
      if (!plant) {
        throw new Error('Failed to update plant');
      }
      return { ok: true, plant };
    });
  }

  async delete(userId: string, plantId: string): Promise<boolean> {
    const userGardenIds = this.db
      .select({ gardenId: gardens.gardenId })
      .from(gardens)
      .where(eq(gardens.userId, userId));

    const rows = await this.db
      .delete(plants)
      .where(and(eq(plants.plantId, plantId), inArray(plants.gardenId, userGardenIds)))
      .returning({ plantId: plants.plantId });
    return rows.length > 0;
  }
}
