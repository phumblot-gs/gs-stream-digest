import { migrate as migratePostgres } from 'drizzle-orm/node-postgres/migrator';
import { getDb } from './client';
import * as path from 'path';

async function runMigrations() {
  console.log('🏃 Running migrations...');

  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL environment variable is required');
    process.exit(1);
  }

  try {
    const db = getDb();
      console.log('[Migrations] Using PostgreSQL migrations from migrations-pg/');
      const migrationsFolder = path.join(__dirname, 'migrations-pg');
      await migratePostgres(db, { migrationsFolder });

    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();