import cron from 'node-cron';
import Piscina from 'piscina';
import path from 'path';
import { getDb, digests } from '@gs-digest/database';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { logEvent } from '../utils/axiom';
import { Sentry } from '../utils/sentry';

interface ScheduledTask {
  task: cron.ScheduledTask;
  digestId: string;
  cronExpression: string;
}

export class DigestScheduler {
  private tasks: Map<string, ScheduledTask> = new Map();
  private db = getDb();
  private pool: Piscina;

  constructor() {
    // Disable Piscina worker pool temporarily - we're running with tsx which doesn't compile .js files
    // TODO: Enable this when we properly compile TypeScript to JavaScript in production
    this.pool = null as any;
    logger.info('Worker pool disabled - executing jobs directly');
  }

  async initialize() {
    try {
      // Load all active digests
      const activeDigests = await this.db
        .select()
        .from(digests)
        .where(eq(digests.isActive, true));

      // Schedule each active digest
      for (const digest of activeDigests) {
        await this.scheduleDigest(digest.id, digest.schedule);
      }

      logger.info(`Scheduled ${activeDigests.length} active digests`);
      await logEvent('scheduler.initialized', {
        digestCount: activeDigests.length
      });
    } catch (error) {
      logger.error('Failed to initialize scheduler:', error);
      Sentry.captureException(error, {
        tags: { component: 'scheduler', action: 'initialize' }
      });
      throw error;
    }
  }

  async scheduleDigest(digestId: string, cronExpression: string) {
    try {
      // Unschedule existing task if any
      if (this.tasks.has(digestId)) {
        await this.unscheduleDigest(digestId);
      }

      // Create cron task
      const task = cron.schedule(
        cronExpression,
        async () => {
          try {
            logger.info(`Cron triggered for digest ${digestId}`);
            await logEvent('digest.cron_triggered', { digestId, cronExpression });
            await this.executeDigest(digestId, 'scheduled');
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(`Failed to execute scheduled digest ${digestId}: ${errorMessage}`);
            Sentry.captureException(error, {
              tags: {
                component: 'scheduler',
                action: 'cron_execution',
                digestId
              }
            });
          }
        },
        {
          scheduled: true,
          timezone: 'UTC'
        }
      );

      this.tasks.set(digestId, { task, digestId, cronExpression });

      logger.info(`Scheduled digest ${digestId} with cron: ${cronExpression}`);
      await logEvent('digest.scheduled', { digestId, cronExpression });
    } catch (error) {
      logger.error(`Failed to schedule digest ${digestId}:`, error);
      Sentry.captureException(error, {
        tags: {
          component: 'scheduler',
          action: 'schedule',
          digestId
        }
      });
      throw error;
    }
  }

  async unscheduleDigest(digestId: string) {
    try {
      const scheduledTask = this.tasks.get(digestId);
      if (scheduledTask) {
        scheduledTask.task.stop();
        this.tasks.delete(digestId);

        logger.info(`Unscheduled digest ${digestId}`);
        await logEvent('digest.unscheduled', { digestId });
      }
    } catch (error) {
      logger.error(`Failed to unschedule digest ${digestId}:`, error);
      Sentry.captureException(error, {
        tags: {
          component: 'scheduler',
          action: 'unschedule',
          digestId
        }
      });
      throw error;
    }
  }

  async rescheduleDigest(digestId: string, newCronExpression: string) {
    await this.unscheduleDigest(digestId);
    await this.scheduleDigest(digestId, newCronExpression);
  }

  async runDigestNow(digestId: string) {
    try {
      // Get digest to verify it exists
      const [digest] = await this.db
        .select()
        .from(digests)
        .where(eq(digests.id, digestId))
        .limit(1);

      if (!digest) {
        throw new Error(`Digest ${digestId} not found`);
      }

      logger.info(`Manually triggered digest ${digestId}`);
      await logEvent('digest.triggered_manually', { digestId });

      await this.executeDigest(digestId, 'manual');
    } catch (error) {
      logger.error(`Failed to run digest ${digestId}:`, error);
      Sentry.captureException(error, {
        tags: {
          component: 'scheduler',
          action: 'manual_trigger',
          digestId
        }
      });
      throw error;
    }
  }

  private async executeDigest(digestId: string, runType: 'scheduled' | 'manual') {
    try {
      let result;

      if (process.env.NODE_ENV === 'production' && this.pool) {
        // Production: use Piscina worker pool
        result = await this.pool.run({
          digestId,
          runType
        });
      } else {
        // Execute directly without workers (both dev and prod for now)
        // Dynamic import without .ts extension
        const processDigest = (await import('../jobs/process-digest')).default;
        result = await processDigest({
          digestId,
          runType
        });
      }

      if (result.success) {
        logger.info(`Digest ${digestId} completed successfully`, result);
      } else {
        logger.error(`Digest ${digestId} failed`, result);
        const error = new Error(result.error || 'Unknown error');
        Sentry.captureException(error, {
          tags: {
            component: 'scheduler',
            action: 'digest_execution',
            digestId,
            runType
          },
          extra: result
        });
        throw error;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Failed to execute digest ${digestId}: ${errorMessage}`);
      Sentry.captureException(error, {
        tags: {
          component: 'scheduler',
          action: 'execution_error',
          digestId,
          runType
        }
      });
      throw error;
    }
  }

  async stop() {
    try {
      for (const [digestId, scheduledTask] of this.tasks.entries()) {
        scheduledTask.task.stop();
      }
      this.tasks.clear();

      // Close the Piscina pool if it exists (production only)
      if (this.pool) {
        await this.pool.destroy();
      }

      logger.info('Scheduler stopped');
      await logEvent('scheduler.stopped', {});
    } catch (error) {
      logger.error('Failed to stop scheduler:', error);
      Sentry.captureException(error, {
        tags: { component: 'scheduler', action: 'stop' }
      });
      throw error;
    }
  }

  getStatus() {
    return {
      isRunning: this.tasks.size > 0,
      jobs: Array.from(this.tasks.values()).map(({ digestId, cronExpression }) => ({
        name: `digest-${digestId}`,
        digestId,
        cron: cronExpression,
      })),
    };
  }
}

