import { migrate as migrateSqlite } from 'drizzle-orm/better-sqlite3/migrator';
import { migrate as migratePostgres } from 'drizzle-orm/node-postgres/migrator';
import { getDb } from './client';
import * as path from 'path';

async function runMigrations() {
  console.log('🏃 Running migrations...');

  try {
    const db = getDb();
    const isPostgres = !!process.env.DATABASE_URL;

    if (isPostgres) {
      console.log('[Migrations] Using PostgreSQL migrations from migrations-pg/');
      const migrationsFolder = path.join(__dirname, 'migrations-pg');
      await migratePostgres(db, { migrationsFolder });
    } else {
      console.log('[Migrations] Using SQLite migrations from migrations/');
      const migrationsFolder = path.join(__dirname, 'migrations');
      migrateSqlite(db, { migrationsFolder });
    }

    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();