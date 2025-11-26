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

export { schema };