import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema-pg/*.ts',
  out: './src/migrations-pg',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://localhost:5432/fly-db'
  },
  verbose: true,
  strict: true
});
