// Load environment variables from project root
import { config } from 'dotenv';
import { resolve } from 'path';

// Try to load .env from project root (../../.env) or current directory
const envPath = resolve(__dirname, '../../.env');
config({ path: envPath });
config(); // Also load from current directory as fallback
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