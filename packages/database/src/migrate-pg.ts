import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as path from 'path';

async function main() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL environment variable is required');
    process.exit(1);
  }

  console.log('[Migrate] Connecting to PostgreSQL...');
  console.log(`[Migrate] DATABASE_URL: ${databaseUrl.replace(/:[^:@]+@/, ':***@')}`); // Hide password in logs

  const pool = new Pool({
    connectionString: databaseUrl,
  });

  try {
    const db = drizzle(pool);

    console.log('[Migrate] Running migrations from ./src/migrations-pg');
    await migrate(db, { migrationsFolder: path.join(__dirname, './migrations-pg') });
    console.log('[Migrate] ✅ Migrations completed successfully!');
  } catch (error) {
    console.error('[Migrate] ❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('[Migrate] Connection closed');
  }
}

main();
