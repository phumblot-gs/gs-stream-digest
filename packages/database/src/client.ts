import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as digestSchema from './schema/digests';
import * as adminSchema from './schema/admin';
import * as templateSchema from './schema/templates';
import * as path from 'path';
import * as fs from 'fs';

const schema = { ...digestSchema, ...adminSchema, ...templateSchema };

let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

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
    db = null;
  }
}

export function getDb() {
  if (!db) {
    const monorepoRoot = findMonorepoRoot();
    const dbPath = process.env.DATABASE_PATH || path.join(monorepoRoot, 'data', 'digest.db');
    console.log(`[Database] getDb() called from:`, new Error().stack?.split('\n')[2]);
    console.log(`[Database] Monorepo root: ${monorepoRoot}`);
    console.log(`[Database] DATABASE_PATH env var: ${process.env.DATABASE_PATH}`);
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

    db = drizzle(sqlite, { schema });
    console.log(`[Database] Database connection established`);
  } else {
    console.log(`[Database] Reusing existing database connection`);
  }

  return db;
}

export { schema };