import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import { logEvent } from '../../utils/axiom';
import { logger } from '../../utils/logger';

const logsRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /api/logs - Receive logs from frontend and forward to Axiom
  fastify.post(
    '/',
    {
      schema: {
        tags: ['logs'],
        summary: 'Receive logs from frontend',
        body: Type.Object({
          level: Type.String(),
          message: Type.String(),
          data: Type.Optional(Type.Any()),
          source: Type.Optional(Type.String()),
          timestamp: Type.Optional(Type.String()),
        }),
        response: {
          200: Type.Object({
            success: Type.Boolean(),
          }),
        },
      },
    },
    async (request, reply) => {
      try {
        const { level, message, data, source, timestamp } = request.body as {
          level: string;
          message: string;
          data?: any;
          source?: string;
          timestamp?: string;
        };

        // Send to Axiom
        await logEvent('frontend_log', {
          level,
          message,
          data: data || {},
          source: source || 'frontend',
          timestamp: timestamp || new Date().toISOString(),
          userAgent: request.headers['user-agent'],
          ip: request.ip,
        });

        return { success: true };
      } catch (error) {
        logger.error('Failed to process frontend log:', error);
        return reply.code(500).send({ error: 'Failed to process log' });
      }
    }
  );
};

export default logsRoutes;

