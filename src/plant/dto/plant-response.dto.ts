import { Exclude, Expose } from 'class-transformer';
import type { PlantType } from '../plant.schema.js';

@Exclude()
export class PlantResponseDto {
  @Expose()
  plantId: string;

  @Expose()
  plantName: string;

  @Expose()
  species: string;

  @Expose()
  plantType: PlantType;

  @Expose()
  plantationDate: string;

  @Expose()
  surfaceAreaRequired: number;

  @Expose()
  idealHumidityLevel: number;

  @Expose()
  gardenId: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
