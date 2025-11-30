<<<<<<< Updated upstream
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as digestSchema from './schema/digests';
import * as adminSchema from './schema/admin';
import * as templateSchema from './schema/templates';
import * as path from 'path';
import * as fs from 'fs';

const schema = { ...digestSchema, ...adminSchema, ...templateSchema };

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!db) {
    const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'digest.db');

    // Ensure directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
=======
import { drizzle as drizzlePostgres } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as digestSchemaPg from './schema-pg/digests';
import * as adminSchemaPg from './schema-pg/admin';
import * as templateSchemaPg from './schema-pg/templates';

const schemaPg = { ...digestSchemaPg, ...adminSchemaPg, ...templateSchemaPg };

type DbInstancePg = ReturnType<typeof drizzlePostgres<typeof schemaPg>>;

let db: DbInstancePg | null = null;
let pgPool: Pool | null = null;

// Force reset the database connection (for use after env loading)
export function resetDb() {
  if (db) {
    console.log('[Database] Resetting database connection');
    if (pgPool) {
      pgPool.end();
      pgPool = null;
    }
    db = null;
  }
}

export function getDb() {
  if (!db) {
    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is required. PostgreSQL connection string must be provided.');
    }

    // Extract hostname for logging (without exposing full URL)
    let hostname = '[UNKNOWN]';
    try {
      const parsed = new URL(databaseUrl);
      hostname = parsed.hostname || '[INVALID URL]';
    } catch {
      hostname = '[INVALID URL]';
    }

    console.log(`[Database] getDb() called from:`, new Error().stack?.split('\n')[2]);
    console.log(`[Database] DATABASE_URL env var: [SET]`);
    console.log(`[Database] Database hostname: ${hostname}`);
    console.log('[Database] Using PostgreSQL');

    try {
      pgPool = new Pool({
        connectionString: databaseUrl,
        // Connection pool settings
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });

      db = drizzlePostgres(pgPool, { schema: schemaPg });
      console.log('[Database] PostgreSQL connection pool established');
      
      // Test connection immediately
      pgPool.on('error', (err) => {
        console.error('[Database] Unexpected error on idle PostgreSQL client:', err);
      });
    } catch (error) {
      console.error('[Database] Failed to create PostgreSQL connection pool:', error);
      throw error;
>>>>>>> Stashed changes
    }

    const sqlite = new Database(dbPath);

    // Enable foreign keys
    sqlite.pragma('foreign_keys = ON');

    // WAL mode for better concurrent access
    sqlite.pragma('journal_mode = WAL');

    db = drizzle(sqlite, { schema });
  }

  return db;
}

<<<<<<< Updated upstream
export { schema };
=======
// Export PostgreSQL schema
const schema = schemaPg;
export { schema };
>>>>>>> Stashed changes
