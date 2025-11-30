import { getDb, digests } from '@gs-digest/database';
import { logger } from '../utils/logger';

export async function initializeDatabase() {
  try {
    console.log('[initializeDatabase] About to call getDb()');
    console.log(`[initializeDatabase] DATABASE_PATH = ${process.env.DATABASE_PATH}`);

    // Get db instance after env vars are loaded
    const db = getDb();
    console.log('[initializeDatabase] Got db instance');

    // Test connection by selecting from digests table
    console.log('[initializeDatabase] About to query digests table');
    const result = await db.select().from(digests).limit(1);
    console.log(`[initializeDatabase] Query result:`, result);

    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error('Database initialization failed:');
    console.error('[initializeDatabase] Full error:', error); // Use console.error for full error output
    throw error;
  }
}