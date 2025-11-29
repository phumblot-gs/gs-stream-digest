// Load environment variables from project root
import { config } from 'dotenv';
import { resolve } from 'path';

// Try to load .env from project root (../../../.env with tsx)
const envPath = resolve(__dirname, '../../../.env');
console.log(`[ENV] __dirname: ${__dirname}`);
console.log(`[ENV] DATABASE_PATH BEFORE loading .env: ${process.env.DATABASE_PATH}`);

// Clear DATABASE_PATH to ensure .env value is used
delete process.env.DATABASE_PATH;

console.log(`[ENV] Attempting to load .env from: ${envPath}`);
const result = config({ path: envPath }); // Load without override since we deleted the env var
if (result.error) {
  console.log(`[ENV] Failed to load from ${envPath}:`, result.error.message);
} else {
  console.log(`[ENV] Successfully loaded .env from ${envPath}`);
}
console.log(`[ENV] DATABASE_PATH AFTER loading .env: ${process.env.DATABASE_PATH}`);

// IMPORTANT: Import database functions AFTER env vars are loaded
// This ensures getDb() will use the correct DATABASE_PATH when first called
import { createServer } from './server';
import { initializeSentry } from './utils/sentry';
import { initializeAxiom } from './utils/axiom';
import { logger } from './utils/logger';
import { DigestScheduler } from './services/scheduler';
import { initializeDatabase } from './services/database';

async function start() {
  try {
    // Initialize monitoring
    initializeSentry();
    const axiom = initializeAxiom();

    // Initialize database
    await initializeDatabase();

    // Create and start server
    const server = await createServer();
    const port = parseInt(process.env.PORT || '3000', 10);
    const host = process.env.HOST || '0.0.0.0';

    await server.listen({ port, host });

    logger.info(`🚀 Server running at http://${host}:${port}`);
    logger.info(`📚 API Documentation at http://${host}:${port}/documentation`);

    // Initialize scheduler after server starts
    const scheduler = new DigestScheduler();
    await scheduler.initialize();
    logger.info('⏰ Digest scheduler initialized');

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully...`);

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
    logger.error('Failed to start server:');
    console.error(error); // Log full error to console
    process.exit(1);
  }
}

start();