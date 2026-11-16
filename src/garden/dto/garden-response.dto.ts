import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class GardenResponseDto {
  @Expose()
  gardenId: string;

  @Expose()
  gardenName: string;

  @Expose()
  totalSurfaceArea: number;

  @Expose()
  locationDescription: string | null;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
