import { Queue } from 'bullmq';
import { logger } from '../utils/logger';

// Get Redis connection from environment
const redisConnection = process.env.REDIS_URL
  ? {
      url: process.env.REDIS_URL,
    }
  : {
      host: 'localhost',
      port: 6379,
    };

// Create the digest processing queue
export const digestQueue = new Queue('digest-processing', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000, // Start with 5 seconds
    },
    removeOnComplete: {
      age: 7 * 24 * 3600, // Keep completed jobs for 7 days
      count: 1000, // Keep max 1000 completed jobs
    },
    removeOnFail: {
      age: 30 * 24 * 3600, // Keep failed jobs for 30 days
    },
  },
});

logger.info('Queue initialized', {
  queueName: digestQueue.name,
  connection: process.env.REDIS_URL ? 'Redis (production)' : 'localhost'
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing queue...');
  await digestQueue.close();
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing queue...');
  await digestQueue.close();
});
