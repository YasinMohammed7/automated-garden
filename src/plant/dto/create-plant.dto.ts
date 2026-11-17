import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { plantType } from '../plant.schema.js';
import type { PlantType } from '../plant.schema.js';

export class CreatePlantDto {
  @IsString()
  @Length(1, 100)
  @Matches(/\S/, {
    message: 'plantName must not be blank',
  })
  plantName: string;

  @IsString()
  @Length(1, 100)
  @Matches(/\S/, {
    message: 'species must not be blank',
  })
  species: string;

  @IsEnum(plantType.enumValues)
  plantType: PlantType;

  @IsDateString()
  plantationDate: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  surfaceAreaRequired: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  idealHumidityLevel: number;
}
