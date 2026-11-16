import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Length, Matches, MaxLength, Min } from 'class-validator';

export class CreateGardenDto {
  @IsString()
  @Length(1, 100)
  @Matches(/\S/, {
    message: 'gardenName must not be blank',
  })
  gardenName: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  totalSurfaceArea: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  locationDescription?: string;
}
