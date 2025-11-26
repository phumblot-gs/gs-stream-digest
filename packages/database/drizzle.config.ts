import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema/*.ts',
  out: './src/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: process.env.DATABASE_PATH || '../../apps/backend/data/digest.db'
  },
  verbose: true,
  strict: true
});