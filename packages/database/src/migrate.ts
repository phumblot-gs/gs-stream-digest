<<<<<<< Updated upstream
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
=======
import { migrate as migratePostgres } from 'drizzle-orm/node-postgres/migrator';
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
    const migrationsFolder = path.join(__dirname, 'migrations');

    migrate(db, { migrationsFolder });
=======
    console.log('[Migrations] Using PostgreSQL migrations from migrations-pg/');
    const migrationsFolder = path.join(__dirname, 'migrations-pg');
    await migratePostgres(db, { migrationsFolder });
>>>>>>> Stashed changes

    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();