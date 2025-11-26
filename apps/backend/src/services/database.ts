import { db, digests } from '@gs-digest/database';
import { logger } from '../utils/logger';

export async function initializeDatabase() {
  try {
    // Test connection by selecting from digests table
    const result = await db.select().from(digests).limit(1);

    logger.info('Database initialized successfully');
  } catch (error) {
    logger.error('Database initialization failed:');
    console.error(error); // Use console.error for full error output
    throw error;
  }
}