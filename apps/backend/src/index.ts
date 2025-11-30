// Load environment variables from project root
import { config } from 'dotenv';
import { resolve } from 'path';

// Try to load .env from project root (../../../.env with tsx)
const envPath = resolve(__dirname, '../../../.env');
console.log(`[ENV] __dirname: ${__dirname}`);

// Verify DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error('[ENV] ERROR: DATABASE_URL environment variable is required');
  process.exit(1);
}

console.log(`[ENV] Attempting to load .env from: ${envPath}`);
const result = config({ path: envPath });
if (result.error) {
  console.log(`[ENV] Failed to load from ${envPath}:`, result.error.message);
} else {
  console.log(`[ENV] Successfully loaded .env from ${envPath}`);
}

// Verify DATABASE_URL is still set after loading .env
if (!process.env.DATABASE_URL) {
  console.error('[ENV] ERROR: DATABASE_URL must be set in environment or .env file');
  process.exit(1);
}

// IMPORTANT: Import database functions AFTER env vars are loaded
import { createServer } from './server';
import { initializeSentry } from './utils/sentry';
import { initializeAxiom } from './utils/axiom';
import { logger } from './utils/logger';
import { DigestScheduler } from './services/scheduler';
import { initializeDatabase } from './services/database';

// Helper function to mask sensitive values in logs
function maskSensitive(value: string | undefined, showLength = true): string {
  if (!value) return '[NOT SET]';
  if (value.length < 10) return '[SET]';
  return `[SET - ${showLength ? `${value.length} chars` : 'hidden'}]`;
}

// Helper function to extract hostname from DATABASE_URL
function extractDbHostname(url: string | undefined): string {
  if (!url) return '[NOT SET]';
  try {
    const parsed = new URL(url);
    return parsed.hostname || '[INVALID URL]';
  } catch {
    return '[INVALID URL]';
  }
}

async function start() {
  try {
    // Log all critical environment variables at startup
    logger.info({
      event: 'app_startup',
      phase: 'initialization',
      env: {
        NODE_ENV: process.env.NODE_ENV || '[NOT SET]',
        PORT: process.env.PORT || '[NOT SET]',
        HOST: process.env.HOST || '[NOT SET]',
        LOG_LEVEL: process.env.LOG_LEVEL || '[NOT SET]',
      },
      database: {
        DATABASE_URL: {
          set: !!process.env.DATABASE_URL,
          hostname: extractDbHostname(process.env.DATABASE_URL),
          length: process.env.DATABASE_URL?.length || 0,
        },
      },
      supabase: {
        SUPABASE_URL: process.env.SUPABASE_URL || '[NOT SET]',
        SUPABASE_ANON_KEY: maskSensitive(process.env.SUPABASE_ANON_KEY),
        SUPABASE_SERVICE_ROLE_KEY: maskSensitive(process.env.SUPABASE_SERVICE_ROLE_KEY),
      },
      monitoring: {
        SENTRY_DSN: maskSensitive(process.env.SENTRY_DSN, false),
        AXIOM_TOKEN: maskSensitive(process.env.AXIOM_TOKEN || process.env.AXIOM_API_KEY),
        AXIOM_DATASET: process.env.AXIOM_DATASET || '[NOT SET]',
      },
      nats: {
        NATS_URL: process.env.NATS_URL || '[NOT SET]',
        NATS_API_KEY: maskSensitive(process.env.NATS_API_KEY),
      },
      email: {
        RESEND_API_KEY: maskSensitive(process.env.RESEND_API_KEY),
      },
    }, '🚀 Starting application...');

    // Initialize monitoring
    logger.info({ event: 'monitoring_init', phase: 'sentry' }, 'Initializing Sentry...');
    initializeSentry();
    
    logger.info({ event: 'monitoring_init', phase: 'axiom' }, 'Initializing Axiom...');
    const axiom = initializeAxiom();
    if (!axiom) {
      logger.warn({ event: 'monitoring_init_failed', service: 'axiom' }, 'Axiom not initialized - logs will not be sent to Axiom');
    }

    // Initialize database with detailed logging
    logger.info({ event: 'database_init', phase: 'start' }, 'Initializing database connection...');
    try {
      await initializeDatabase();
      logger.info({ event: 'database_init', phase: 'success' }, '✅ Database initialized successfully');
    } catch (error) {
      logger.error({
        event: 'database_init',
        phase: 'failed',
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name,
        } : String(error),
        databaseUrl: {
          set: !!process.env.DATABASE_URL,
          hostname: extractDbHostname(process.env.DATABASE_URL),
        },
      }, '❌ Database initialization failed');
      throw error;
    }

    // Create and start server
    logger.info({ event: 'server_init', phase: 'create' }, 'Creating server...');
    const server = await createServer();
    const port = parseInt(process.env.PORT || '3000', 10);
    const host = process.env.HOST || '0.0.0.0';

    await server.listen({ port, host });

    logger.info({
      event: 'server_started',
      port,
      host,
      url: `http://${host}:${port}`,
    }, `🚀 Server running at http://${host}:${port}`);
    
    logger.info({
      event: 'server_started',
      documentationUrl: `http://${host}:${port}/documentation`,
    }, `📚 API Documentation at http://${host}:${port}/documentation`);

    // Initialize scheduler after server starts
    logger.info({ event: 'scheduler_init', phase: 'start' }, 'Initializing digest scheduler...');
    const scheduler = new DigestScheduler();
    await scheduler.initialize();
    logger.info({ event: 'scheduler_init', phase: 'success' }, '⏰ Digest scheduler initialized');

    logger.info({
      event: 'app_startup',
      phase: 'complete',
      status: 'ready',
    }, '✅ Application fully started and ready');

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info({
        event: 'app_shutdown',
        signal,
      }, `${signal} received, shutting down gracefully...`);

      await scheduler.stop();
      await server.close();

      if (axiom) {
        await axiom.flush();
      }

      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error({
      event: 'app_startup',
      phase: 'failed',
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : String(error),
    }, '❌ Failed to start server');
    console.error(error); // Log full error to console
    process.exit(1);
  }
}

start();