import type { User } from '../users/users.schema.js';

declare module '@nestjs/authentication' {
  interface AuthenticationTypes {
    user: User;
  }
}
