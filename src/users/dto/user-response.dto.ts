import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class UserResponseDto {
  @Expose()
  firstName: string | null;

  @Expose()
  lastName: string | null;

  @Expose()
  age: number | null;

  @Expose()
  emailAddress: string;

  @Expose()
  emailVerified: boolean;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
