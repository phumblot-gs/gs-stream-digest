import { db, digests } from '@gs-digest/database';
import { logger } from '../utils/logger';

// Helper function to extract hostname from DATABASE_URL
function extractDbHostname(url: string | undefined): string {
  if (!url) return '[NOT SET]';
  try {
<<<<<<< Updated upstream
    // Test connection by selecting from digests table
    const result = await db.select().from(digests).limit(1);
=======
    const parsed = new URL(url);
    return parsed.hostname || '[INVALID URL]';
  } catch {
    return '[INVALID URL]';
  }
}

export async function initializeDatabase() {
  const startTime = Date.now();
  
  logger.info({
    event: 'database_init',
    phase: 'start',
    databaseUrl: {
      set: !!process.env.DATABASE_URL,
      hostname: extractDbHostname(process.env.DATABASE_URL),
      length: process.env.DATABASE_URL?.length || 0,
    },
  }, 'Initializing database connection...');

  try {
    // Get db instance after env vars are loaded
    logger.debug({ event: 'database_init', phase: 'get_instance' }, 'Calling getDb()...');
    const db = getDb();
    logger.debug({ event: 'database_init', phase: 'got_instance' }, 'Got database instance');

    // Test connection by selecting from digests table
    logger.debug({ event: 'database_init', phase: 'test_query' }, 'Testing database connection with query...');
    const queryStartTime = Date.now();
    const result = await db.select().from(digests).limit(1);
    const queryDuration = Date.now() - queryStartTime;
    
    logger.info({
      event: 'database_init',
      phase: 'success',
      duration: Date.now() - startTime,
      queryDuration,
      resultCount: result.length,
    }, '✅ Database initialized successfully');
>>>>>>> Stashed changes

    return db;
  } catch (error) {
<<<<<<< Updated upstream
    logger.error('Database initialization failed:');
    console.error(error); // Use console.error for full error output
=======
    const duration = Date.now() - startTime;
    const errorDetails = error instanceof Error ? {
      message: error.message,
      name: error.name,
      stack: error.stack,
      code: (error as any).code,
    } : { error: String(error) };

    logger.error({
      event: 'database_init',
      phase: 'failed',
      duration,
      error: errorDetails,
      databaseUrl: {
        set: !!process.env.DATABASE_URL,
        hostname: extractDbHostname(process.env.DATABASE_URL),
        length: process.env.DATABASE_URL?.length || 0,
      },
    }, '❌ Database initialization failed');
    
    console.error('[initializeDatabase] Full error:', error);
>>>>>>> Stashed changes
    throw error;
  }
}