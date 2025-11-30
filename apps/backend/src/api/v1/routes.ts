import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import { getDb } from '@gs-digest/database';
import * as schema from '@gs-digest/database';
import { eq, and, desc, sql } from 'drizzle-orm';
import { verifyApiKey } from '../../plugins/api-key-auth';

/**
 * Public API v1 Routes
 *
 * These endpoints are accessible via API key authentication.
 * All routes are scoped to the accountId associated with the API key.
 */
const v1Routes: FastifyPluginAsync = async (fastify) => {
  const db = getDb();

  // Apply API key authentication to all routes
  fastify.addHook('preHandler', verifyApiKey);

  // GET /api/v1/digests - List all digests
  fastify.get(
    '/digests',
    {
      schema: {
        tags: ['v1'],
        summary: 'List all digests',
        description: 'Returns all digests for the authenticated account',
        security: [{ ApiKey: [] }],
        response: {
          200: Type.Object({
            digests: Type.Array(Type.Object({
              id: Type.String(),
              name: Type.String(),
              description: Type.Union([Type.String(), Type.Null()]),
              schedule: Type.String(),
              isActive: Type.Boolean(),
              createdAt: Type.String(),
            })),
            count: Type.Number(),
          }),
        },
      },
    },
    async (request, reply) => {
      const accountId = request.apiKey?.accountId || null;

      const digests = await db
        .select({
          id: schema.digests.id,
          name: schema.digests.name,
          description: schema.digests.description,
          schedule: schema.digests.schedule,
          isActive: schema.digests.isActive,
          createdAt: schema.digests.createdAt,
        })
        .from(schema.digests)
        .where(
          accountId
            ? eq(schema.digests.accountId, accountId)
            : sql`${schema.digests.accountId} IS NULL`
        )
        .orderBy(desc(schema.digests.createdAt));

      return {
        digests: digests.map((d) => ({
          ...d,
          createdAt: d.createdAt.toISOString(),
        })),
        count: digests.length,
      };
    }
  );

  // GET /api/v1/digests/:id - Get a single digest
  fastify.get(
    '/digests/:id',
    {
      schema: {
        tags: ['v1'],
        summary: 'Get digest by ID',
        security: [{ ApiKey: [] }],
        params: Type.Object({
          id: Type.String(),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const accountId = request.apiKey?.accountId || null;

      const [digest] = await db
        .select()
        .from(schema.digests)
        .where(
          and(
            eq(schema.digests.id, id),
            accountId
              ? eq(schema.digests.accountId, accountId)
              : sql`${schema.digests.accountId} IS NULL`
          )
        )
        .limit(1);

      if (!digest) {
        return reply.code(404).send({ error: 'Digest not found' });
      }

      return digest;
    }
  );

  // GET /api/v1/templates - List templates
  fastify.get(
    '/templates',
    {
      schema: {
        tags: ['v1'],
        summary: 'List email templates',
        security: [{ ApiKey: [] }],
      },
    },
    async (request, reply) => {
      const accountId = request.apiKey?.accountId || null;

      const templates = await db
        .select()
        .from(schema.emailTemplates)
        .where(
          accountId
            ? eq(schema.emailTemplates.accountId, accountId)
            : sql`${schema.emailTemplates.accountId} IS NULL`
        )
        .orderBy(desc(schema.emailTemplates.createdAt));

      return {
        templates: templates.map((t) => ({
          ...t,
          createdAt: t.createdAt.toISOString(),
          updatedAt: t.updatedAt.toISOString(),
        })),
        count: templates.length,
      };
    }
  );

  // GET /api/v1/stats - Get statistics
  fastify.get(
    '/stats',
    {
      schema: {
        tags: ['v1'],
        summary: 'Get digest statistics',
        description: 'Returns statistics for the last 30 days',
        security: [{ ApiKey: [] }],
      },
    },
    async (request, reply) => {
      const accountId = request.apiKey?.accountId || null;
      const thirtyDaysAgo = Math.floor(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).getTime() / 1000
      );

      const accountCondition = accountId
        ? eq(schema.digests.accountId, accountId)
        : sql`${schema.digests.accountId} IS NULL`;

      // Count total runs
      const [runsStats] = await db
        .select({
          total: sql<number>`COUNT(*)`,
          completed: sql<number>`SUM(CASE WHEN ${schema.digestRuns.status} = 'success' THEN 1 ELSE 0 END)`,
          failed: sql<number>`SUM(CASE WHEN ${schema.digestRuns.status} = 'failed' THEN 1 ELSE 0 END)`,
        })
        .from(schema.digestRuns)
        .innerJoin(schema.digests, eq(schema.digestRuns.digestId, schema.digests.id))
        .where(
          and(accountCondition, sql`${schema.digestRuns.runAt} >= ${thirtyDaysAgo}`)
        );

      // Count emails
      const [emailStats] = await db
        .select({
          sent: sql<number>`COUNT(*)`,
          delivered: sql<number>`SUM(CASE WHEN ${schema.emailLogs.status} = 'delivered' THEN 1 ELSE 0 END)`,
          bounced: sql<number>`SUM(CASE WHEN ${schema.emailLogs.status} = 'bounced' THEN 1 ELSE 0 END)`,
          failed: sql<number>`SUM(CASE WHEN ${schema.emailLogs.status} = 'failed' THEN 1 ELSE 0 END)`,
        })
        .from(schema.emailLogs)
        .innerJoin(schema.digestRuns, eq(schema.emailLogs.digestRunId, schema.digestRuns.id))
        .innerJoin(schema.digests, eq(schema.digestRuns.digestId, schema.digests.id))
        .where(accountCondition);

      return {
        period: 'last_30_days',
        runs: {
          total: Number(runsStats.total || 0),
          completed: Number(runsStats.completed || 0),
          failed: Number(runsStats.failed || 0),
          successRate: runsStats.total
            ? Math.round((Number(runsStats.completed) / Number(runsStats.total)) * 100)
            : 0,
        },
        emails: {
          sent: Number(emailStats.sent || 0),
          delivered: Number(emailStats.delivered || 0),
          bounced: Number(emailStats.bounced || 0),
          failed: Number(emailStats.failed || 0),
        },
      };
    }
  );
};

export default v1Routes;
