import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import { getDb, schema } from '@gs-digest/database';
import { EmailSender } from '../../services/email/sender';
import { logger } from '../../utils/logger';

const webhookRoutes: FastifyPluginAsync = async (fastify) => {
  const db = getDb();
  const emailSender = new EmailSender();

  // POST /api/webhooks/resend - Resend webhook
  fastify.post(
    '/resend',
    {
      schema: {
        tags: ['webhooks'],
        summary: 'Handle Resend webhook events',
        body: Type.Any()
      }
    },
    async (request, reply) => {
      const event = request.body as any;

      try {
        // Verify webhook signature (if configured)
        // TODO: Add webhook signature verification

        // PostgreSQL handles timestamps with default functions
        // Store webhook event
        await db.insert(schema.webhookEvents).values({
          id: event.id || nanoid(),
          eventType: event.type,
          eventId: event.id,
          resendId: event.data?.email_id,
          payload: JSON.stringify(event),
          receivedAt: new Date(),
        });

        // Update email status
        if (event.data?.email_id) {
          await emailSender.updateEmailStatus(
            event.data.email_id,
            mapResendStatus(event.type),
            new Date(event.created_at),
            event.data
          );
        }

        logger.info(`Processed Resend webhook: ${event.type}`);

        return { success: true };
      } catch (error) {
        logger.error('Failed to process Resend webhook:', error);
        return reply.code(500).send({ error: 'Webhook processing failed' });
      }
    }
  );
};

function mapResendStatus(eventType: string): string {
  const mapping: Record<string, string> = {
    'email.sent': 'sent',
    'email.delivered': 'delivered',
    'email.delivery_delayed': 'delayed',
    'email.complained': 'complained',
    'email.bounced': 'bounced',
    'email.opened': 'opened',
    'email.clicked': 'clicked'
  };
  return mapping[eventType] || eventType;
}

import { nanoid } from 'nanoid';

export default webhookRoutes;