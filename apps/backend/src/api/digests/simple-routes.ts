import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getDb, digests, digestTemplates } from '@gs-digest/database';
import { eq, desc, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import { EmailSender } from '../../services/email/sender';
import { Sentry } from '../../utils/sentry';

const createDigestSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  filters: z.object({
    eventTypes: z.array(z.string()).optional(),
    sourceApplications: z.array(z.string()).optional(),
    applications: z.array(z.string()).optional(), // Backward compatibility
    maxAgeHours: z.number().optional(),
  }),
  schedule: z.string(),
  timezone: z.string().default('Europe/Paris'),
  recipients: z.array(z.string().email()),
  testRecipients: z.array(z.string().email()).optional(),
  templateId: z.string(),
  isActive: z.boolean().default(true),
});

const updateDigestSchema = createDigestSchema.partial();

const simpleDigestRoutes: FastifyPluginAsync = async (fastify) => {
  // List all digests
  fastify.get('/', async (request, reply) => {
    try {
      const db = getDb();
      const allDigests = await db
        .select()
        .from(digests)
        .orderBy(desc(digests.createdAt));

      // Parse JSON fields and normalize filters
      const parsedDigests = allDigests.map(digest => {
        const filters = typeof digest.filters === 'string' ? JSON.parse(digest.filters) : digest.filters;
        
        // Normalize filters: ensure sourceApplications exists (use applications if available)
        if (filters && filters.applications && !filters.sourceApplications) {
          filters.sourceApplications = filters.applications;
        }
        
        return {
          ...digest,
          filters,
          recipients: typeof digest.recipients === 'string' ? JSON.parse(digest.recipients) : digest.recipients,
          testRecipients: digest.testRecipients && typeof digest.testRecipients === 'string' 
            ? JSON.parse(digest.testRecipients) 
            : (digest.testRecipients || [])
        };
      });

      return reply.send({
        digests: parsedDigests,
        total: parsedDigests.length,
        limit: 100,
        offset: 0
      });
    } catch (error) {
      fastify.log.error(error);
      
      // Send error to Sentry
      if (process.env.SENTRY_DSN) {
        Sentry.captureException(error, {
          contexts: {
            request: {
              method: request.method,
              url: request.url
            }
          }
        });
      }
      
      throw error; // Re-throw to let Fastify error handler process it
    }
  });

  // Get single digest
  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const db = getDb();

      const digestList = await db.select().from(digests)
        .where(eq(digests.id, id))
        .limit(1);

      if (!digestList.length) {
        return reply.status(404).send({ error: 'Digest not found' });
      }

      const digest = digestList[0];
      
      // Parse JSON fields
      const filters = typeof digest.filters === 'string' ? JSON.parse(digest.filters) : digest.filters;
      
      // Normalize filters: ensure sourceApplications exists (use applications if available)
      if (filters && filters.applications && !filters.sourceApplications) {
        filters.sourceApplications = filters.applications;
      }
      
      const parsedDigest = {
        ...digest,
        filters,
        recipients: typeof digest.recipients === 'string' ? JSON.parse(digest.recipients) : digest.recipients,
        testRecipients: digest.testRecipients && typeof digest.testRecipients === 'string' 
          ? JSON.parse(digest.testRecipients) 
          : (digest.testRecipients || [])
      };

      return reply.send(parsedDigest);
    } catch (error) {
      fastify.log.error(error);
      
      // Send error to Sentry
      if (process.env.SENTRY_DSN) {
        Sentry.captureException(error, {
          contexts: {
            request: {
              method: request.method,
              url: request.url,
              params: request.params
            }
          }
        });
      }
      
      throw error; // Re-throw to let Fastify error handler process it
    }
  });

  // Create new digest
  fastify.post('/', async (request, reply) => {
    try {
      const data = createDigestSchema.parse(request.body);
      const db = getDb();

      // Normalize filters: convert sourceApplications to applications for backward compatibility
      const normalizedFilters = { ...data.filters };
      if (normalizedFilters.sourceApplications && !normalizedFilters.applications) {
        normalizedFilters.applications = normalizedFilters.sourceApplications;
      }

      const digest: any = {
        id: randomUUID(),
        accountId: 'default', // TODO: Get from auth
        name: data.name,
        description: data.description || null,
        filters: JSON.stringify(normalizedFilters),
        schedule: data.schedule,
        timezone: data.timezone,
        recipients: JSON.stringify(data.recipients),
        testRecipients: data.testRecipients ? JSON.stringify(data.testRecipients) : '[]',
        templateId: data.templateId,
        isActive: data.isActive,
        createdBy: 'system', // TODO: Get from auth
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await db.insert(digests).values(digest);

      return reply.status(201).send(digest);
    } catch (error) {
      fastify.log.error(error);
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid request data', details: error.errors });
      }
      Sentry.captureException(error);
      return reply.status(500).send({ error: 'Failed to create digest: ' + (error as any).message });
    }
  });

  // Update digest
  fastify.put('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = updateDigestSchema.parse(request.body);
      const db = getDb();

      // Fetch existing digest
      const existingDigests = await db.select().from(digests)
        .where(eq(digests.id, id))
        .limit(1);

      if (!existingDigests.length) {
        return reply.status(404).send({ error: 'Digest not found' });
      }

      // Prepare update data
      const updateData: any = {
        updatedAt: new Date()
      };

      // Add fields from data, converting objects/arrays to JSON strings
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.filters !== undefined) {
        // Normalize filters: convert sourceApplications to applications for backward compatibility
        const normalizedFilters = { ...data.filters };
        if (normalizedFilters.sourceApplications && !normalizedFilters.applications) {
          normalizedFilters.applications = normalizedFilters.sourceApplications;
        }
        updateData.filters = JSON.stringify(normalizedFilters);
      }
      if (data.schedule !== undefined) updateData.schedule = data.schedule;
      if (data.timezone !== undefined) updateData.timezone = data.timezone;
      if (data.recipients !== undefined) updateData.recipients = JSON.stringify(data.recipients);
      if (data.testRecipients !== undefined) updateData.testRecipients = JSON.stringify(data.testRecipients);
      if (data.templateId !== undefined) updateData.templateId = data.templateId;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;

      await db.update(digests)
        .set(updateData)
        .where(eq(digests.id, id));

      const updatedDigest = { ...existingDigests[0], ...updateData };

      return reply.send(updatedDigest);
    } catch (error) {
      fastify.log.error(error);
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid request data', details: error.errors });
      }
      Sentry.captureException(error);
      return reply.status(500).send({ error: 'Failed to update digest: ' + (error as any).message });
    }
  });

  // Delete digest
  fastify.delete('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const db = getDb();

      // Check if digest exists
      const existingDigests = await db.select().from(digests)
        .where(eq(digests.id, id))
        .limit(1);

      if (!existingDigests.length) {
        return reply.status(404).send({ error: 'Digest not found' });
      }

      // Delete digest
      await db.delete(digests)
        .where(eq(digests.id, id));

      return reply.status(204).send();
    } catch (error) {
      fastify.log.error(error);
      Sentry.captureException(error);
      return reply.status(500).send({ error: 'Failed to delete digest' });
    }
  });

  // Send test digest
  fastify.post('/:id/test', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { recipientEmail, limit = 10 } = request.body as { recipientEmail: string; limit?: number };
      const db = getDb();

      // Get digest
      const digestList = await db.select().from(digests)
        .where(eq(digests.id, id))
        .limit(1);

      if (!digestList.length) {
        return reply.status(404).send({ error: 'Digest not found' });
      }

      const digest = digestList[0];

      // Get template
      const templateList = await db.select().from(digestTemplates)
        .where(eq(digestTemplates.id, digest.templateId))
        .limit(1);

      if (!templateList.length) {
        return reply.status(404).send({ error: 'Template not found' });
      }

      const template = templateList[0];

      // Generate some sample events for testing matching the template structure
      const sampleEvents = Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
        id: `test-event-${i + 1}`,
        uid: `test-uid-${i + 1}`,
        type: 'file.share',
        timestamp: new Date(Date.now() - i * 3600000).toISOString(),
        payload: {
          sellers_shared: [
            {
              account_name: `Vendeur Test ${i + 1}`,
              created_files_count: Math.floor(Math.random() * 5) + 1,
              updated_files_count: Math.floor(Math.random() * 3)
            }
          ]
        },
        metadata: {
          sourceApplication: 'gs-sourcing',
          environment: 'development'
        }
      }));

      // Send test email
      const emailSender = new EmailSender();
      const result = await emailSender.sendTestEmail(
        {
          subjectLiquid: template.subjectLiquid,
          bodyHtmlLiquid: template.bodyHtmlLiquid,
          bodyTextLiquid: template.bodyTextLiquid || ''
        },
        sampleEvents as any,
        recipientEmail,
        {
          name: digest.name,
          accountId: digest.accountId
        }
      );

      if (!result.success) {
        fastify.log.error('EmailSender.sendTestEmail failed:', result.error);
        return reply.status(500).send({
          success: false,
          message: result.error || 'Failed to send test email',
          error: result.error,
          details: {
            error: result.error,
            message: result.error || 'Erreur lors de l\'envoi de l\'email de test'
          },
          eventsFound: sampleEvents.length,
          emailSent: false
        });
      }

      return reply.send({
        success: true,
        message: `Test email sent to ${recipientEmail}`,
        eventsFound: sampleEvents.length,
        emailSent: true
      });
    } catch (error) {
      fastify.log.error('Test digest endpoint error:', error);
      Sentry.captureException(error);
      return reply.status(500).send({
        error: 'Failed to send test digest',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  });

  // Send digest immediately
  fastify.post('/:id/send', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const db = getDb();

      // Get digest
      const digestList = await db.select().from(digests)
        .where(eq(digests.id, id))
        .limit(1);

      if (!digestList.length) {
        return reply.status(404).send({ error: 'Digest not found' });
      }

      // Import scheduler dynamically to avoid circular dependencies
      const { DigestScheduler } = await import('../../services/scheduler');
      const scheduler = new DigestScheduler();

      // Trigger digest to run immediately
      await scheduler.runDigestNow(id);

      return reply.send({
        success: true,
        message: 'Digest sent successfully',
        runId: randomUUID()
      });
    } catch (error) {
      fastify.log.error(error);
      Sentry.captureException(error);
      return reply.status(500).send({ error: 'Failed to send digest' });
    }
  });
};

export default simpleDigestRoutes;