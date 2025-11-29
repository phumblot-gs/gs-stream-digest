import { getDb, digests, digestTemplates, digestRuns } from '@gs-digest/database';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { NATSEventClient } from '../services/nats/client';
import { EventFilter } from '../services/nats/event-filter';
import { EmailSender } from '../services/email/sender';
import type { Event, EventFilters } from '@gs-digest/shared';
import { logger } from '../utils/logger';
import { logEvent } from '../utils/axiom';

interface JobData {
  digestId: string;
  runType?: 'scheduled' | 'manual' | 'test';
  triggeredBy?: string;
  testRecipient?: string;
}

interface JobResult {
  success: boolean;
  digestId: string;
  runId: string;
  eventsCount?: number;
  emailsSent?: number;
  error?: string;
}

export default async function processDigest(data: JobData): Promise<JobResult> {
  const db = getDb();
  const natsClient = new NATSEventClient();
  const emailSender = new EmailSender();
  const runId = nanoid();
  const startTime = Date.now();

  logger.info(`Processing digest ${data.digestId} (run: ${runId})`);
  logger.info(`[process-digest] DATABASE_PATH = ${process.env.DATABASE_PATH}`);

  // Log job start to Axiom
  await logEvent('digest.job_started', {
    digestId: data.digestId,
    runId,
    runType: data.runType || 'scheduled',
    triggeredBy: data.triggeredBy
  });

  try {
    // Get digest configuration
    logger.info(`[process-digest] Querying for digest ${data.digestId}`);
    logger.info(`[process-digest] data.digestId type: ${typeof data.digestId}`);
    const allDigests = await db.select().from(digests);
    logger.info(`[process-digest] Total digests in DB: ${allDigests.length}`);
    logger.info(`[process-digest] Digest IDs: ${allDigests.map(d => d.id).join(', ')}`);

    if (allDigests.length > 0) {
      logger.info(`[process-digest] First digest ID: "${allDigests[0].id}", type: ${typeof allDigests[0].id}`);
      logger.info(`[process-digest] Comparing: "${data.digestId}" === "${allDigests[0].id}" => ${data.digestId === allDigests[0].id}`);
    }

    const [digestResult] = await db
      .select()
      .from(digests)
      .where(eq(digests.id, data.digestId))
      .limit(1);

    logger.info(`[process-digest] Query result: ${digestResult ? 'found' : 'NOT FOUND'}`);

    // Fallback: try manual filter if query fails
    let digest = digestResult;
    if (!digest && allDigests.length > 0) {
      logger.info(`[process-digest] Trying manual filter...`);
      const manualDigest = allDigests.find(d => d.id === data.digestId);
      logger.info(`[process-digest] Manual filter result: ${manualDigest ? 'found' : 'NOT FOUND'}`);
      if (manualDigest) {
        // Use the manually found digest
        digest = manualDigest;
        logger.info(`[process-digest] Using manual filter result`);
      }
    }

    if (!digest) {
      throw new Error(`Digest ${data.digestId} not found`);
    }
    logger.info(`[process-digest] Using digest: ${digest ? 'YES' : 'NO'}, ID: ${digest?.id}`);

    if (!digest.isActive || digest.isPaused) {
      logger.info(`Digest ${data.digestId} is not active or is paused`);

      // Log skipped digest to Axiom
      await logEvent('digest.job_skipped', {
        digestId: data.digestId,
        runId,
        reason: !digest.isActive ? 'not_active' : 'paused',
        durationMs: Date.now() - startTime
      });

      return {
        success: true,
        digestId: data.digestId,
        runId,
        eventsCount: 0,
        emailsSent: 0
      };
    }

    // Get template
    let template;
    if (digest.templateId) {
      [template] = await db
        .select()
        .from(digestTemplates)
        .where(eq(digestTemplates.id, digest.templateId))
        .limit(1);
    }

    if (!template) {
      throw new Error(`Template not found for digest ${data.digestId}`);
    }

    // Create digest run record
    await db.insert(digestRuns).values({
      id: runId,
      digestId: digest.id,
      runType: data.runType || 'scheduled',
      status: 'processing',
      triggeredBy: data.triggeredBy,
      runAt: new Date()
    });

    // Calculate time window
    const lastCheckAt = digest.lastCheckAt ? new Date(digest.lastCheckAt) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const currentTime = Date.now();

    // Fetch events from NATS
    let events: Event[] = [];
    try {
      const filters = JSON.parse(digest.filters) as EventFilters;

      // Fetch raw events
      const rawEvents = await natsClient.fetchEventsSince(
        digest.lastEventUid,
        lastCheckAt.getTime(),
        {
          accountId: digest.accountId,
          eventTypes: filters.eventTypes
        }
      );

      // Apply additional filters
      events = EventFilter.filterEvents(rawEvents, filters);

      logger.info(`Fetched and filtered ${events.length} events for digest ${digest.id}`);

      // Log event fetching result to Axiom
      await logEvent('digest.events_fetched', {
        digestId: digest.id,
        runId,
        rawEventsCount: rawEvents.length,
        filteredEventsCount: events.length,
        lastCheckAt: lastCheckAt.toISOString(),
        lastEventUid: digest.lastEventUid
      });
    } catch (error) {
      logger.error(`Failed to fetch events for digest ${digest.id}:`, error);
      throw error;
    }

    // Check if there are events to send
    if (events.length === 0) {
      logger.info(`No events to send for digest ${digest.id}`);

      // Log no events to Axiom
      await logEvent('digest.no_events', {
        digestId: digest.id,
        runId,
        durationMs: Date.now() - startTime
      });

      // Update digest run
      await db
        .update(digestRuns)
        .set({
          status: 'success',
          eventsCount: 0,
          emailsSent: 0,
          completedAt: new Date(),
          durationMs: Date.now() - new Date(runId).getTime()
        })
        .where(eq(digestRuns.id, runId));

      // Update digest last check
      await db
        .update(digests)
        .set({
          lastCheckAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(digests.id, digest.id));

      return {
        success: true,
        digestId: digest.id,
        runId,
        eventsCount: 0,
        emailsSent: 0
      };
    }

    // Sort events by timestamp (newest first)
    events = EventFilter.sortEvents(events, 'timestamp', 'desc');

    // Get recipients
    let recipients: string[] = [];
    if (data.runType === 'test' && data.testRecipient) {
      recipients = [data.testRecipient];
    } else {
      recipients = JSON.parse(digest.recipients);
    }

    // Send emails
    let emailResults = { sent: 0, failed: 0 };
    try {
      emailResults = await emailSender.sendDigest(
        runId,
        template,
        events,
        recipients,
        {
          id: digest.id,
          name: digest.name,
          accountId: digest.accountId
        }
      );

      logger.info(`Sent ${emailResults.sent} emails for digest ${digest.id}`);
    } catch (error) {
      logger.error(`Failed to send emails for digest ${digest.id}:`, error);
      throw error;
    }

    // Update digest run
    const lastEvent = events[0];
    await db
      .update(digestRuns)
      .set({
        status: emailResults.failed > 0 ? 'partial' : 'success',
        eventsCount: events.length,
        events: JSON.stringify(events),
        eventUidStart: events[events.length - 1].uid,
        eventUidEnd: lastEvent.uid,
        emailsSent: emailResults.sent,
        emailsFailed: emailResults.failed,
        completedAt: new Date(),
        durationMs: Date.now() - new Date(runId).getTime()
      })
      .where(eq(digestRuns.id, runId));

    // Update digest with last event info (only for non-test runs)
    if (data.runType !== 'test') {
      await db
        .update(digests)
        .set({
          lastEventUid: lastEvent.uid,
          lastCheckAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(digests.id, digest.id));
    }

    // Emit digest.sent event back to NATS
    await natsClient.emitEvent({
      uid: nanoid(),
      timestamp: new Date().toISOString(),
      eventType: 'digest.sent',
      accountId: digest.accountId,
      source: {
        application: 'gs-stream-digest',
        environment: process.env.NODE_ENV || 'development'
      },
      data: {
        digestId: digest.id,
        digestName: digest.name,
        runId,
        eventsCount: events.length,
        recipientsCount: recipients.length,
        emailsSent: emailResults.sent
      }
    });

    // Log successful job completion to Axiom
    await logEvent('digest.job_completed', {
      digestId: digest.id,
      runId,
      runType: data.runType || 'scheduled',
      eventsCount: events.length,
      recipientsCount: recipients.length,
      emailsSent: emailResults.sent,
      emailsFailed: emailResults.failed,
      status: emailResults.failed > 0 ? 'partial' : 'success',
      durationMs: Date.now() - startTime
    });

    await logEvent('digest.processed', {
      digestId: digest.id,
      runId,
      eventsCount: events.length,
      emailsSent: emailResults.sent,
      emailsFailed: emailResults.failed,
      durationMs: Date.now() - startTime
    });

    return {
      success: true,
      digestId: digest.id,
      runId,
      eventsCount: events.length,
      emailsSent: emailResults.sent
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    logger.error(`Failed to process digest ${data.digestId}: ${errorMessage}`);
    if (errorStack) {
      logger.error(`Stack trace: ${errorStack}`);
    }

    // Update digest run with error
    await db
      .update(digestRuns)
      .set({
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        completedAt: new Date(),
        durationMs: Date.now() - startTime
      })
      .where(eq(digestRuns.id, runId));

    // Log job failure to Axiom with detailed error info
    await logEvent('digest.job_failed', {
      digestId: data.digestId,
      runId,
      runType: data.runType || 'scheduled',
      error: error instanceof Error ? error.message : 'Unknown error',
      errorStack: error instanceof Error ? error.stack : undefined,
      durationMs: Date.now() - startTime
    });

    await logEvent('digest.failed', {
      digestId: data.digestId,
      runId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return {
      success: false,
      digestId: data.digestId,
      runId,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
