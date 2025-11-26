import { Resend } from 'resend';
import { nanoid } from 'nanoid';
import { getDb, schema } from '@gs-digest/database';
import { EmailRenderer } from '@gs-digest/email-templates';
import type { Event, DigestTemplate } from '@gs-digest/shared';
import { logger } from '../../utils/logger';
import { logEvent } from '../../utils/axiom';
import { Sentry } from '../../utils/sentry';

interface EmailData {
  to: string[];
  subject: string;
  html: string;
  text: string;
  tags?: { name: string; value: string }[];
}

export class EmailSender {
  private resend: Resend;
  private renderer: EmailRenderer;
  private db = getDb();

  constructor() {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      logger.warn('RESEND_API_KEY is not configured. Email sending will fail.');
    }
    this.resend = new Resend(apiKey);
    this.renderer = new EmailRenderer();
  }

  /**
   * Send digest email
   */
  async sendDigest(
    digestRunId: string,
    template: Pick<DigestTemplate, 'subjectLiquid' | 'bodyHtmlLiquid' | 'bodyTextLiquid'>,
    events: Event[],
    recipients: string[],
    digestInfo: { id: string; name: string; accountId: string }
  ): Promise<{ sent: number; failed: number }> {
    const results = { sent: 0, failed: 0 };

    try {
      // Render email content
      const rendered = await this.renderer.render(template, {
        events,
        eventsCount: events.length,
        digest: {
          name: digestInfo.name
        },
        now: new Date(),
        accountId: digestInfo.accountId
      });

      // Send to each recipient
      for (const recipient of recipients) {
        try {
          // Create email log entry
          const emailLogId = nanoid();
          await this.db.insert(schema.emailLogs).values({
            id: emailLogId,
            digestRunId,
            recipient,
            subject: rendered.subject,
            status: 'pending',
            createdAt: new Date()
          });

          // Send email via Resend
          const response = await this.resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL || 'noreply@mediagrade.grand-shooting.com',
            to: recipient,
            subject: rendered.subject,
            html: rendered.bodyHtml,
            text: rendered.bodyText,
            tags: [
              { name: 'digest_id', value: digestInfo.id },
              { name: 'digest_run_id', value: digestRunId },
              { name: 'account_id', value: digestInfo.accountId }
            ]
          });

          if (response.error) {
            // Provide more detailed error message for authentication issues
            if (response.error.message?.includes('401') || response.error.message?.includes('invalid') || response.error.message?.includes('unauthorized')) {
              throw new Error('Clé API Resend invalide ou manquante. Vérifiez la configuration RESEND_API_KEY.');
            }
            throw new Error(response.error.message || 'Erreur lors de l\'envoi de l\'email');
          }

          // Update email log with Resend ID
          await this.db
            .update(schema.emailLogs)
            .set({
              resendId: response.data?.id,
              status: 'sent',
              sentAt: new Date()
            })
            .where(eq(schema.emailLogs.id, emailLogId));

          results.sent++;

          logger.info(`Email sent to ${recipient} for digest ${digestInfo.id}`);
          await logEvent('email.sent', {
            digestId: digestInfo.id,
            digestRunId,
            recipient,
            resendId: response.data?.id
          });
        } catch (error) {
          results.failed++;

          // Update email log with error
          await this.db
            .update(schema.emailLogs)
            .set({
              status: 'failed',
              error: error instanceof Error ? error.message : 'Unknown error'
            })
            .where(eq(schema.emailLogs.digestRunId, digestRunId))
            .where(eq(schema.emailLogs.recipient, recipient));

          logger.error(`Failed to send email to ${recipient}:`, error);
          await logEvent('email.failed', {
            digestId: digestInfo.id,
            digestRunId,
            recipient,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return results;
    } catch (error) {
      logger.error('Failed to send digest emails:', error);
      throw error;
    }
  }

  /**
   * Send test email
   */
  async sendTestEmail(
    template: Pick<DigestTemplate, 'subjectLiquid' | 'bodyHtmlLiquid' | 'bodyTextLiquid'>,
    events: Event[],
    recipient: string,
    digestInfo: { name: string; accountId: string }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Render email content
      const rendered = await this.renderer.render(template, {
        events,
        eventsCount: events.length,
        digest: {
          name: digestInfo.name
        },
        now: new Date(),
        accountId: digestInfo.accountId
      });

      // Remove any existing [TEST] prefix and add a single one
      const cleanSubject = rendered.subject.replace(/^\[TEST\]\s*/i, '');
      const subject = `[TEST] ${cleanSubject}`;

      // Send email via Resend
      const response = await this.resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || 'digest@grand-shooting.com',
        to: recipient,
        subject,
        html: rendered.bodyHtml,
        text: rendered.bodyText,
        tags: [
          { name: 'type', value: 'test' },
          { name: 'account_id', value: digestInfo.accountId }
        ]
      });

      if (response.error) {
        // Provide more detailed error message for authentication issues
        if (response.error.message?.includes('401') || response.error.message?.includes('invalid') || response.error.message?.includes('unauthorized')) {
          throw new Error('Clé API Resend invalide ou manquante. Vérifiez la configuration RESEND_API_KEY.');
        }
        throw new Error(response.error.message || 'Erreur lors de l\'envoi de l\'email');
      }

      logger.info(`Test email sent to ${recipient}`);
      await logEvent('email.test_sent', {
        recipient,
        resendId: response.data?.id
      });

      return { success: true };
    } catch (error) {
      let errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;

      // Check if it's an authentication error from Resend
      if (errorMessage.includes('401') || errorMessage.includes('unauthorized') || errorMessage.includes('invalid')) {
        errorMessage = 'Clé API Resend invalide ou manquante. Vérifiez la configuration RESEND_API_KEY dans les variables d\'environnement.';
      }

      // Check if API key is missing
      if (!process.env.RESEND_API_KEY) {
        errorMessage = 'RESEND_API_KEY n\'est pas configurée. Veuillez configurer la clé API Resend dans les variables d\'environnement.';
      }

      logger.error(`Failed to send test email to ${recipient}: ${errorMessage}`);
      if (errorStack) {
        logger.error(`Stack trace: ${errorStack}`);
      }

      // Also send to Sentry
      if (process.env.SENTRY_DSN) {
        Sentry.captureException(error, {
          tags: {
            type: 'test_email',
            recipient,
            has_api_key: !!process.env.RESEND_API_KEY
          }
        });
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Preview email without sending
   */
  async previewEmail(
    template: Pick<DigestTemplate, 'subjectLiquid' | 'bodyHtmlLiquid' | 'bodyTextLiquid'>,
    events: Event[],
    digestInfo: { name: string; accountId: string }
  ): Promise<{ subject: string; html: string; text: string }> {
    try {
      const rendered = await this.renderer.render(template, {
        events,
        eventsCount: events.length,
        digest: {
          name: digestInfo.name
        },
        now: new Date(),
        accountId: digestInfo.accountId
      });

      return rendered;
    } catch (error) {
      logger.error('Failed to preview email:', error);
      throw error;
    }
  }

  /**
   * Update email status from webhook
   */
  async updateEmailStatus(
    resendId: string,
    status: string,
    timestamp?: Date,
    metadata?: any
  ): Promise<void> {
    try {
      const updateData: any = {
        status,
        resendStatus: status
      };

      // Update specific timestamp based on status
      switch (status) {
        case 'delivered':
          updateData.deliveredAt = timestamp || new Date();
          break;
        case 'opened':
          updateData.openedAt = timestamp || new Date();
          updateData.openCount = sql`COALESCE(open_count, 0) + 1`;
          break;
        case 'clicked':
          updateData.clickedAt = timestamp || new Date();
          updateData.clickCount = sql`COALESCE(click_count, 0) + 1`;
          break;
        case 'bounced':
          updateData.bouncedAt = timestamp || new Date();
          updateData.error = metadata?.message;
          break;
      }

      await this.db
        .update(schema.emailLogs)
        .set(updateData)
        .where(eq(schema.emailLogs.resendId, resendId));

      logger.debug(`Updated email status for ${resendId}: ${status}`);
    } catch (error) {
      logger.error(`Failed to update email status for ${resendId}:`, error);
      throw error;
    }
  }

  /**
   * Get email statistics for a digest run
   */
  async getRunStatistics(digestRunId: string) {
    const emails = await this.db
      .select()
      .from(schema.emailLogs)
      .where(eq(schema.emailLogs.digestRunId, digestRunId));

    return {
      total: emails.length,
      sent: emails.filter(e => e.status === 'sent').length,
      delivered: emails.filter(e => e.status === 'delivered').length,
      opened: emails.filter(e => e.status === 'opened').length,
      clicked: emails.filter(e => e.status === 'clicked').length,
      bounced: emails.filter(e => e.status === 'bounced').length,
      failed: emails.filter(e => e.status === 'failed').length,
      openRate: emails.length > 0
        ? (emails.filter(e => e.openedAt).length / emails.length) * 100
        : 0,
      clickRate: emails.length > 0
        ? (emails.filter(e => e.clickedAt).length / emails.length) * 100
        : 0
    };
  }
}

// Import for SQL functions
import { eq, sql } from 'drizzle-orm';