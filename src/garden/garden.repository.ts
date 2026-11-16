import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '@nestjs/drizzle';
import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { gardens } from './garden.schema.js';
import type { Garden, NewGarden } from './garden.schema.js';

type GardenInput = Pick<NewGarden, 'gardenName' | 'totalSurfaceArea' | 'locationDescription'>;
type GardenUpdate = Partial<
  Pick<Garden, 'gardenName' | 'totalSurfaceArea' | 'locationDescription'>
>;

@Injectable()
export class GardensRepository {
  constructor(@InjectDrizzle() private readonly db: NodePgDatabase) {}

  async findByUser(userId: string): Promise<Garden[]> {
    return this.db.select().from(gardens).where(eq(gardens.userId, userId));
  }

  async findById(userId: string, gardenId: string): Promise<Garden | undefined> {
    const rows = await this.db
      .select()
      .from(gardens)
      .where(and(eq(gardens.userId, userId), eq(gardens.gardenId, gardenId)));
    return rows[0];
  }

  async create(userId: string, data: GardenInput): Promise<Garden> {
    const rows = await this.db
      .insert(gardens)
      .values({ ...data, userId })
      .returning();
    const garden = rows[0];
    if (!garden) {
      throw new Error('Failed to create garden');
    }
    return garden;
  }

  async update(userId: string, gardenId: string, data: GardenUpdate): Promise<Garden | undefined> {
    const rows = await this.db
      .update(gardens)
      .set(data)
      .where(and(eq(gardens.userId, userId), eq(gardens.gardenId, gardenId)))
      .returning();
    return rows[0];
  }

  async delete(userId: string, gardenId: string): Promise<boolean> {
    const rows = await this.db
      .delete(gardens)
      .where(and(eq(gardens.userId, userId), eq(gardens.gardenId, gardenId)))
      .returning({ gardenId: gardens.gardenId });
    return rows.length > 0;
  }
}
