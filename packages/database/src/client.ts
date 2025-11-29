import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzlePostgres } from 'drizzle-orm/node-postgres';
import Database from 'better-sqlite3';
import { Pool } from 'pg';
import * as digestSchema from './schema/digests';
import * as adminSchema from './schema/admin';
import * as templateSchema from './schema/templates';
import * as path from 'path';
import * as fs from 'fs';

const schema = { ...digestSchema, ...adminSchema, ...templateSchema };

type DbInstance = ReturnType<typeof drizzleSqlite<typeof schema>> | ReturnType<typeof drizzlePostgres<typeof schema>>;

let db: DbInstance | null = null;
let pgPool: Pool | null = null;

// Find monorepo root by looking for package.json with workspaces
function findMonorepoRoot(): string {
  let currentDir = process.cwd();
  while (currentDir !== '/') {
    const packageJsonPath = path.join(currentDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
        if (packageJson.workspaces) {
          return currentDir;
        }
      } catch {
        // Continue searching
      }
    }
    currentDir = path.dirname(currentDir);
  }
  // Fallback to process.cwd() if not found
  return process.cwd();
}

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
    const databasePath = process.env.DATABASE_PATH;

    console.log(`[Database] getDb() called from:`, new Error().stack?.split('\n')[2]);
    console.log(`[Database] DATABASE_URL env var: ${databaseUrl ? '[SET]' : '[NOT SET]'}`);
    console.log(`[Database] DATABASE_PATH env var: ${databasePath || '[NOT SET]'}`);

    // If DATABASE_URL is set, use PostgreSQL
    if (databaseUrl) {
      console.log('[Database] Using PostgreSQL');
      pgPool = new Pool({
        connectionString: databaseUrl,
        // Connection pool settings
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });

      db = drizzlePostgres(pgPool, { schema });
      console.log('[Database] PostgreSQL connection pool established');
    } else {
      // Otherwise, use SQLite (for local development)
      console.log('[Database] Using SQLite');
      const monorepoRoot = findMonorepoRoot();
      const dbPath = databasePath || path.join(monorepoRoot, 'data', 'digest.db');
      console.log(`[Database] Monorepo root: ${monorepoRoot}`);
      console.log(`[Database] Final database path: ${dbPath}`);

      // Ensure directory exists
      const dir = path.dirname(dbPath);
      if (!fs.existsSync(dir)) {
        console.log(`[Database] Creating directory: ${dir}`);
        fs.mkdirSync(dir, { recursive: true });
      }

      const sqlite = new Database(dbPath);

      // Enable foreign keys
      sqlite.pragma('foreign_keys = ON');

      // WAL mode for better concurrent access
      sqlite.pragma('journal_mode = WAL');

      db = drizzleSqlite(sqlite, { schema });
      console.log(`[Database] SQLite database connection established`);
    }
  } else {
    console.log(`[Database] Reusing existing database connection`);
  }

  return db;
}

export { schema };
