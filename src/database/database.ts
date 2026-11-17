import { defineRelations } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { gardens } from '../garden/garden.schema.js';
import { plants } from '../plant/plant.schema.js';
import { users } from '../users/users.schema.js';

export const relations = defineRelations({ users, gardens, plants }, (r) => ({
  users: {
    gardens: r.many.gardens(),
  },
  gardens: {
    user: r.one.users({
      from: r.gardens.userId,
      to: r.users.userId,
    }),
    plants: r.many.plants(),
  },
  plants: {
    garden: r.one.gardens({
      from: r.plants.gardenId,
      to: r.gardens.gardenId,
    }),
  },
}));

export type Database = NodePgDatabase<typeof relations>;
