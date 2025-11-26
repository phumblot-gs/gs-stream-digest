import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { getDb } from './client';
import * as path from 'path';

async function runMigrations() {
  console.log('🏃 Running migrations...');

  try {
    const db = getDb();
    const migrationsFolder = path.join(__dirname, 'migrations');

    migrate(db, { migrationsFolder });

    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();