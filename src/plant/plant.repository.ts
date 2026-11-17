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
  | 'gardenId'
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

  async findCapacity(
    userId: string,
    gardenId: string,
    excludePlantId?: string,
  ): Promise<{ totalSurfaceArea: number; usedSurfaceArea: number } | undefined> {
    const joinConditions = [eq(plants.gardenId, gardens.gardenId)];
    if (excludePlantId) {
      joinConditions.push(ne(plants.plantId, excludePlantId));
    }

    const rows = await this.db
      .select({
        totalSurfaceArea: gardens.totalSurfaceArea,
        usedSurfaceArea: sql<number>`coalesce(sum(${plants.surfaceAreaRequired}), 0)`,
      })
      .from(gardens)
      .leftJoin(plants, and(...joinConditions))
      .where(and(eq(gardens.gardenId, gardenId), eq(gardens.userId, userId)))
      .groupBy(gardens.gardenId);

    const row = rows[0];
    if (!row) {
      return undefined;
    }
    return row;
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

  async create(data: PlantInput): Promise<Plant> {
    const rows = await this.db.insert(plants).values(data).returning();
    const plant = rows[0];
    if (!plant) {
      throw new Error('Failed to create plant');
    }
    return plant;
  }

  async update(userId: string, plantId: string, data: PlantUpdate): Promise<Plant | undefined> {
    const userGardenIds = this.db
      .select({ gardenId: gardens.gardenId })
      .from(gardens)
      .where(eq(gardens.userId, userId));

    const rows = await this.db
      .update(plants)
      .set(data)
      .where(and(eq(plants.plantId, plantId), inArray(plants.gardenId, userGardenIds)))
      .returning();
    return rows[0];
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
