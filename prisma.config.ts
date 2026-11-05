import 'dotenv/config';
import { defineConfig, env } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
  // @ts-expect-error - shadowDatabaseUrl is a runtime property for Prisma migrate deploy
  shadowDatabaseUrl: env('DATABASE_URL'),
});
