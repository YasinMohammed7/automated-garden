import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateUserDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  @MaxLength(254)
  emailAddress: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  @Matches(/\S/, {
    message: 'firstName must not be blank',
  })
  firstName?: string | null;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  @Matches(/\S/, {
    message: 'lastName must not be blank',
  })
  lastName?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(125)
  age?: number | null;
}
