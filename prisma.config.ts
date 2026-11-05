import 'dotenv/config';
import { defineConfig, env, type PrismaConfig } from 'prisma/config';

const config: PrismaConfig & { shadowDatabaseUrl?: string } = {
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
  shadowDatabaseUrl: env('DATABASE_URL'),
};

export default defineConfig(config);
