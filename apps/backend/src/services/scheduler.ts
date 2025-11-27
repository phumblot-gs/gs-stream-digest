import Bree from 'bree';
import path from 'path';
import { getDb, schema } from '@gs-digest/database';
import { eq } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { logEvent } from '../utils/axiom';

export class DigestScheduler {
  private bree: Bree;
  private db = getDb();

  constructor() {
    this.bree = new Bree({
      root: path.join(__dirname, '../jobs'),
      defaultExtension: process.env.NODE_ENV === 'production' ? 'js' : 'ts',
      logger: false,
      workerMessageHandler: this.handleWorkerMessage.bind(this),
    });
  }

  async initialize() {
    try {
      // Load all active digests
      const activeDigests = await this.db
        .select()
        .from(schema.digests)
        .where(eq(schema.digests.isActive, true));

      // Schedule each active digest
      for (const digest of activeDigests) {
        await this.scheduleDigest(digest.id, digest.schedule);
      }

      // Start the scheduler
      this.bree.start();

      logger.info(`Scheduled ${activeDigests.length} active digests`);
    } catch (error) {
      logger.error('Failed to initialize scheduler:', error);
      throw error;
    }
  }

  async scheduleDigest(digestId: string, cronExpression: string) {
    try {
      // Add job to scheduler
      this.bree.add({
        name: `digest-${digestId}`,
        path: 'process-digest',
        cron: cronExpression,
        worker: {
          workerData: {
            digestId,
            env: process.env,
          },
        },
      });

      // Start the job if scheduler is already running
      if (this.bree.isRunning) {
        await this.bree.start(`digest-${digestId}`);
      }

      logger.info(`Scheduled digest ${digestId} with cron: ${cronExpression}`);
      await logEvent('digest.scheduled', { digestId, cronExpression });
    } catch (error) {
      logger.error(`Failed to schedule digest ${digestId}:`, error);
      throw error;
    }
  }

  async unscheduleDigest(digestId: string) {
    try {
      const jobName = `digest-${digestId}`;

      // Stop and remove the job
      await this.bree.stop(jobName);
      await this.bree.remove(jobName);

      logger.info(`Unscheduled digest ${digestId}`);
      await logEvent('digest.unscheduled', { digestId });
    } catch (error) {
      logger.error(`Failed to unschedule digest ${digestId}:`, error);
      throw error;
    }
  }

  async rescheduleDigest(digestId: string, newCronExpression: string) {
    await this.unscheduleDigest(digestId);
    await this.scheduleDigest(digestId, newCronExpression);
  }

  async runDigestNow(digestId: string) {
    try {
      const jobName = `digest-${digestId}`;

      // Check if job already exists, if not add it temporarily
      const existingJob = this.bree.config.jobs.find((job: any) => job.name === jobName);

      if (!existingJob) {
        // Get digest to verify it exists
        const [digest] = await this.db
          .select()
          .from(schema.digests)
          .where(eq(schema.digests.id, digestId))
          .limit(1);

        if (!digest) {
          throw new Error(`Digest ${digestId} not found`);
        }

        // Add job temporarily with manual trigger context
        this.bree.add({
          name: jobName,
          path: 'process-digest',
          worker: {
            workerData: {
              digestId,
              runType: 'manual',
              env: process.env,
            },
          },
        });
      }

      // Run the job immediately
      await this.bree.run(jobName);

      logger.info(`Manually triggered digest ${digestId}`);
      await logEvent('digest.triggered_manually', { digestId });
    } catch (error) {
      logger.error(`Failed to run digest ${digestId}:`, error);
      throw error;
    }
  }

  private handleWorkerMessage(message: any) {
    if (message.error) {
      logger.error('Worker error:', message.error);
    } else {
      logger.info('Worker message:', message);
    }
  }

  async stop() {
    await this.bree.stop();
    logger.info('Scheduler stopped');
  }

  getStatus() {
    return {
      isRunning: this.bree.isRunning,
      jobs: this.bree.config.jobs.map((job: any) => ({
        name: job.name,
        cron: job.cron,
        interval: job.interval,
        timeout: job.timeout,
      })),
    };
  }
}