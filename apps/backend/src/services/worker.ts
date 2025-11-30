import { Worker, Job } from 'bullmq';
import { logger } from '../utils/logger';
import { logEvent } from '../utils/axiom';
import { Sentry } from '../utils/sentry';
import processDigest from '../jobs/process-digest';

// Get Redis connection from environment
const redisConnection = process.env.REDIS_URL
  ? {
      url: process.env.REDIS_URL,
    }
  : {
      host: 'localhost',
      port: 6379,
    };

// Define job data interface
interface DigestJobData {
  digestId: string;
  runType: 'scheduled' | 'manual';
}

// Create the worker
export const digestWorker = new Worker<DigestJobData>(
  'digest-processing',
  async (job: Job<DigestJobData>) => {
    const { digestId, runType } = job.data;

    logger.info(`Processing job ${job.id} for digest ${digestId}`, {
      jobId: job.id,
      digestId,
      runType,
      attempt: job.attemptsMade + 1,
    });

    try {
      // Call the existing process-digest function
      const result = await processDigest({ digestId, runType });

      if (result.success) {
        logger.info(`Job ${job.id} completed successfully`, {
          jobId: job.id,
          digestId,
          result,
        });
        await logEvent('digest.job_completed', {
          jobId: job.id,
          digestId,
          runType,
          eventsCount: result.eventsCount,
          emailsSent: result.emailsSent,
        });
        return result;
      } else {
        // Job failed but was handled by process-digest
        const error = new Error(result.error || 'Job failed');
        logger.error(`Job ${job.id} failed`, {
          jobId: job.id,
          digestId,
          error: result.error,
        });
        Sentry.captureException(error, {
          tags: {
            component: 'worker',
            action: 'job_failed',
            digestId,
            runType,
          },
          extra: result,
        });
        throw error;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Job ${job.id} threw an exception`, {
        jobId: job.id,
        digestId,
        error: errorMessage,
        attempt: job.attemptsMade + 1,
      });
      Sentry.captureException(error, {
        tags: {
          component: 'worker',
          action: 'job_exception',
          digestId,
          runType,
        },
      });
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 2, // Process 2 jobs concurrently
    limiter: {
      max: 10, // Max 10 jobs per duration
      duration: 60000, // 1 minute
    },
  }
);

// Worker event handlers
digestWorker.on('completed', (job: Job) => {
  logger.info(`Job ${job.id} has completed`, { jobId: job.id });
});

digestWorker.on('failed', (job: Job | undefined, err: Error) => {
  if (job) {
    logger.error(`Job ${job.id} has failed with ${err.message}`, {
      jobId: job.id,
      error: err.message,
      attempt: job.attemptsMade,
    });
  } else {
    logger.error(`Job failed with ${err.message}`, {
      error: err.message,
    });
  }
});

digestWorker.on('error', (err: Error) => {
  logger.error(`Worker error: ${err.message}`, { error: err.message });
  Sentry.captureException(err, {
    tags: { component: 'worker', action: 'worker_error' },
  });
});

logger.info('Worker initialized', {
  workerName: digestWorker.name,
  connection: process.env.REDIS_URL ? 'Redis (production)' : 'localhost',
  concurrency: 2,
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing worker...');
  await digestWorker.close();
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing worker...');
  await digestWorker.close();
});
