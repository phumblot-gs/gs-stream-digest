import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import { nanoid } from 'nanoid';
import { getDb, schema } from '@gs-digest/database';
import { eq, and, or, desc, asc } from 'drizzle-orm';
import { requireAuth } from '../../plugins/auth';
import { DigestScheduler } from '../../services/scheduler';
import { canAccessAccount, canModifyResource, filterByAccountAccess } from '@gs-digest/shared';
import type { CreateDigest, UpdateDigest } from '@gs-digest/shared';
import { logger } from '../../utils/logger';

const digestRoutes: FastifyPluginAsync = async (fastify) => {
  const db = getDb();

  // GET /api/digests - List digests
  fastify.get(
    '/',
    {
      preHandler: requireAuth(),
      schema: {
        tags: ['digests'],
        summary: 'List digests',
        security: [{ Bearer: [] }, { ApiKey: [] }],
        querystring: Type.Object({
          limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100, default: 20 })),
          offset: Type.Optional(Type.Number({ minimum: 0, default: 0 })),
          accountId: Type.Optional(Type.String()),
          isActive: Type.Optional(Type.Boolean()),
          sortBy: Type.Optional(Type.String({ enum: ['name', 'createdAt', 'updatedAt'], default: 'createdAt' })),
          sortOrder: Type.Optional(Type.String({ enum: ['asc', 'desc'], default: 'desc' }))
        }),
        response: {
          200: Type.Object({
            digests: Type.Array(Type.Any()),
            total: Type.Number(),
            limit: Type.Number(),
            offset: Type.Number()
          })
        }
      }
    },
    async (request, reply) => {
      const { limit = 20, offset = 0, accountId, isActive, sortBy = 'createdAt', sortOrder = 'desc' } = request.query;

      // Build query
      let query = db.select().from(schema.digests);

      // Filter by account access
      if (request.user!.role !== 'superadmin') {
        query = query.where(eq(schema.digests.accountId, request.user!.accountId));
      } else if (accountId) {
        query = query.where(eq(schema.digests.accountId, accountId));
      }

      // Filter by active status
      if (isActive !== undefined) {
        query = query.where(eq(schema.digests.isActive, isActive));
      }

      // Sort
      const orderFn = sortOrder === 'desc' ? desc : asc;
      switch (sortBy) {
        case 'name':
          query = query.orderBy(orderFn(schema.digests.name));
          break;
        case 'updatedAt':
          query = query.orderBy(orderFn(schema.digests.updatedAt));
          break;
        default:
          query = query.orderBy(orderFn(schema.digests.createdAt));
      }

      // Paginate
      const digests = await query.limit(limit).offset(offset);

      // Get total count
      const [{ count }] = await db
        .select({ count: sql`count(*)` })
        .from(schema.digests)
        .where(
          request.user!.role !== 'superadmin'
            ? eq(schema.digests.accountId, request.user!.accountId)
            : accountId
            ? eq(schema.digests.accountId, accountId)
            : undefined
        );

      return {
        digests,
        total: Number(count),
        limit,
        offset
      };
    }
  );

  // GET /api/digests/:id - Get digest by ID
  fastify.get(
    '/:id',
    {
      preHandler: requireAuth(),
      schema: {
        tags: ['digests'],
        summary: 'Get digest by ID',
        security: [{ Bearer: [] }, { ApiKey: [] }],
        params: Type.Object({
          id: Type.String()
        }),
        response: {
          200: Type.Any(),
          404: Type.Object({ error: Type.String() })
        }
      }
    },
    async (request, reply) => {
      const { id } = request.params;

      const [digest] = await db
        .select()
        .from(schema.digests)
        .where(eq(schema.digests.id, id))
        .limit(1);

      if (!digest) {
        return reply.code(404).send({ error: 'Digest not found' });
      }

      // Check access
      if (!canAccessAccount(request.user!, digest.accountId)) {
        return reply.code(403).send({ error: 'Access denied' });
      }

      // Get template if exists
      let template;
      if (digest.templateId) {
        [template] = await db
          .select()
          .from(schema.digestTemplates)
          .where(eq(schema.digestTemplates.id, digest.templateId))
          .limit(1);
      }

      // Get recent runs
      const recentRuns = await db
        .select()
        .from(schema.digestRuns)
        .where(eq(schema.digestRuns.digestId, id))
        .orderBy(desc(schema.digestRuns.runAt))
        .limit(10);

      return {
        ...digest,
        template,
        recentRuns,
        filters: JSON.parse(digest.filters),
        recipients: JSON.parse(digest.recipients),
        testRecipients: digest.testRecipients ? JSON.parse(digest.testRecipients) : []
      };
    }
  );

  // POST /api/digests - Create digest
  fastify.post(
    '/',
    {
      preHandler: requireAuth({ requireRole: ['superadmin', 'admin'] }),
      schema: {
        tags: ['digests'],
        summary: 'Create digest',
        security: [{ Bearer: [] }, { ApiKey: [] }],
        body: Type.Any(), // CreateDigest schema
        response: {
          201: Type.Any()
        }
      }
    },
    async (request, reply) => {
      const data = request.body as CreateDigest;
      const digestId = nanoid();

      // Ensure user can only create digests for their account
      const accountId = request.user!.role === 'superadmin' && data.accountId
        ? data.accountId
        : request.user!.accountId;

      // Convert schedule config to cron expression
      const cronExpression = scheduleToCron(data.schedule);

      // Create digest
      const digest = await db.insert(schema.digests).values({
        id: digestId,
        name: data.name,
        description: data.description,
        accountId,
        filters: JSON.stringify(data.filters),
        schedule: cronExpression,
        timezone: data.schedule.timezone || 'Europe/Paris',
        recipients: JSON.stringify(data.recipients),
        testRecipients: JSON.stringify(data.testRecipients || []),
        templateId: data.templateId,
        isActive: data.isActive ?? true,
        isPaused: data.isPaused ?? false,
        createdBy: request.user!.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      // Schedule the digest if active
      if (digest[0].isActive && !digest[0].isPaused) {
        const scheduler = new DigestScheduler();
        await scheduler.scheduleDigest(digestId, cronExpression);
      }

      logger.info(`Digest ${digestId} created by ${request.user!.id}`);

      return reply.code(201).send(digest[0]);
    }
  );

  // PUT /api/digests/:id - Update digest
  fastify.put(
    '/:id',
    {
      preHandler: requireAuth({ requireRole: ['superadmin', 'admin'] }),
      schema: {
        tags: ['digests'],
        summary: 'Update digest',
        security: [{ Bearer: [] }, { ApiKey: [] }],
        params: Type.Object({
          id: Type.String()
        }),
        body: Type.Any(), // UpdateDigest schema
        response: {
          200: Type.Any()
        }
      }
    },
    async (request, reply) => {
      const { id } = request.params;
      const data = request.body as UpdateDigest;

      // Get existing digest
      const [existing] = await db
        .select()
        .from(schema.digests)
        .where(eq(schema.digests.id, id))
        .limit(1);

      if (!existing) {
        return reply.code(404).send({ error: 'Digest not found' });
      }

      // Check permissions
      if (!canModifyResource(request.user!, existing.accountId)) {
        return reply.code(403).send({ error: 'Access denied' });
      }

      // Build update data
      const updateData: any = {
        updatedAt: new Date()
      };

      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.filters !== undefined) updateData.filters = JSON.stringify(data.filters);
      if (data.recipients !== undefined) updateData.recipients = JSON.stringify(data.recipients);
      if (data.testRecipients !== undefined) updateData.testRecipients = JSON.stringify(data.testRecipients);
      if (data.templateId !== undefined) updateData.templateId = data.templateId;
      if (data.isActive !== undefined) updateData.isActive = data.isActive;
      if (data.isPaused !== undefined) updateData.isPaused = data.isPaused;

      // Handle schedule update
      if (data.schedule) {
        const cronExpression = scheduleToCron(data.schedule);
        updateData.schedule = cronExpression;
        updateData.timezone = data.schedule.timezone || existing.timezone;

        // Reschedule if active
        const scheduler = new DigestScheduler();
        if (existing.isActive && !existing.isPaused) {
          await scheduler.rescheduleDigest(id, cronExpression);
        }
      }

      // Update digest
      const [updated] = await db
        .update(schema.digests)
        .set(updateData)
        .where(eq(schema.digests.id, id))
        .returning();

      logger.info(`Digest ${id} updated by ${request.user!.id}`);

      return updated;
    }
  );

  // DELETE /api/digests/:id - Delete digest
  fastify.delete(
    '/:id',
    {
      preHandler: requireAuth({ requireRole: ['superadmin', 'admin'] }),
      schema: {
        tags: ['digests'],
        summary: 'Delete digest',
        security: [{ Bearer: [] }, { ApiKey: [] }],
        params: Type.Object({
          id: Type.String()
        }),
        response: {
          204: Type.Null()
        }
      }
    },
    async (request, reply) => {
      const { id } = request.params;

      // Get digest to check permissions
      const [existing] = await db
        .select()
        .from(schema.digests)
        .where(eq(schema.digests.id, id))
        .limit(1);

      if (!existing) {
        return reply.code(404).send({ error: 'Digest not found' });
      }

      // Check permissions
      if (!canModifyResource(request.user!, existing.accountId)) {
        return reply.code(403).send({ error: 'Access denied' });
      }

      // Unschedule the digest
      const scheduler = new DigestScheduler();
      await scheduler.unscheduleDigest(id);

      // Delete digest (cascade will delete runs and logs)
      await db.delete(schema.digests).where(eq(schema.digests.id, id));

      logger.info(`Digest ${id} deleted by ${request.user!.id}`);

      return reply.code(204).send();
    }
  );

  // POST /api/digests/:id/test - Test digest
  fastify.post(
    '/:id/test',
    {
      preHandler: requireAuth({ requireRole: ['superadmin', 'admin'] }),
      schema: {
        tags: ['digests'],
        summary: 'Test digest with sample events',
        security: [{ Bearer: [] }, { ApiKey: [] }],
        params: Type.Object({
          id: Type.String()
        }),
        body: Type.Object({
          recipientEmail: Type.String({ format: 'email' }),
          limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100, default: 10 }))
        }),
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            message: Type.String(),
            eventsFound: Type.Number(),
            emailSent: Type.Boolean()
          })
        }
      }
    },
    async (request, reply) => {
      const { id } = request.params;
      const { recipientEmail, limit = 10 } = request.body;

      // Get digest
      const [digest] = await db
        .select()
        .from(schema.digests)
        .where(eq(schema.digests.id, id))
        .limit(1);

      if (!digest) {
        return reply.code(404).send({ error: 'Digest not found' });
      }

      // Check permissions
      if (!canModifyResource(request.user!, digest.accountId)) {
        return reply.code(403).send({ error: 'Access denied' });
      }

      // Trigger test run via scheduler
      const scheduler = new DigestScheduler();
      // This will use the process-digest job with test parameters
      // For now, return a simple response
      return {
        success: true,
        message: 'Test digest triggered',
        eventsFound: 0,
        emailSent: false
      };
    }
  );

  // POST /api/digests/:id/send - Send digest immediately
  fastify.post(
    '/:id/send',
    {
      preHandler: requireAuth({ requireRole: ['superadmin', 'admin'] }),
      schema: {
        tags: ['digests'],
        summary: 'Send digest immediately',
        security: [{ Bearer: [] }, { ApiKey: [] }],
        params: Type.Object({
          id: Type.String()
        }),
        response: {
          200: Type.Object({
            success: Type.Boolean(),
            message: Type.String(),
            runId: Type.String()
          })
        }
      }
    },
    async (request, reply) => {
      const { id } = request.params;

      // Get digest
      const [digest] = await db
        .select()
        .from(schema.digests)
        .where(eq(schema.digests.id, id))
        .limit(1);

      if (!digest) {
        return reply.code(404).send({ error: 'Digest not found' });
      }

      // Check permissions
      if (!canModifyResource(request.user!, digest.accountId)) {
        return reply.code(403).send({ error: 'Access denied' });
      }

      // Trigger immediate send via scheduler
      const scheduler = new DigestScheduler();
      await scheduler.runDigestNow(id);

      return {
        success: true,
        message: 'Digest triggered for immediate send',
        runId: nanoid()
      };
    }
  );
};

// Helper function to convert schedule config to cron expression
function scheduleToCron(schedule: any): string {
  switch (schedule.type) {
    case 'hourly':
      return '0 * * * *'; // Every hour at minute 0
    case 'every_6_hours':
      return '0 */6 * * *'; // Every 6 hours
    case 'daily':
      const [hour, minute] = (schedule.dailyTime || '09:00').split(':');
      return `${minute} ${hour} * * *`; // Daily at specified time
    case 'weekly':
      const days = (schedule.weekDays || [1]).join(','); // Default to Monday
      const [wHour, wMinute] = (schedule.weeklyTime || '09:00').split(':');
      return `${wMinute} ${wHour} * * ${days}`;
    case 'monthly':
      const day = schedule.monthDay || 1;
      const [mHour, mMinute] = (schedule.monthlyTime || '09:00').split(':');
      return `${mMinute} ${mHour} ${day} * *`;
    case 'custom':
      return schedule.cronExpression || '0 9 * * *'; // Default to 9 AM daily
    default:
      return '0 9 * * *'; // Default
  }
}

// Import SQL for count
import { sql } from 'drizzle-orm';

export default digestRoutes;