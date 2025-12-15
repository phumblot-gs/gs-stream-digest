import { Resend } from 'resend';
import { nanoid } from 'nanoid';
import { getDb, schema } from '@gs-digest/database';
import { EmailRenderer } from '@gs-digest/email-templates';
import type { Event, DigestTemplate } from '@gs-digest/shared';
import { logger } from '../../utils/logger';
import { logEvent } from '../../utils/axiom';
import { Sentry } from '../../utils/sentry';
import { getResendRateLimiter } from './rate-limiter';

interface EmailData {
  to: string[];
  subject: string;
  html: string;
  text: string;
  tags?: { name: string; value: string }[];
}

/**
 * Helper function to capture Resend API errors in Sentry with detailed context
 */
function captureResendErrorInSentry(
  error: any,
  context: {
    digestId?: string;
    digestRunId?: string;
    recipient?: string;
    emailType?: 'digest' | 'test';
    resendError?: {
      name?: string;
      message?: string;
      statusCode?: number;
    };
  }
) {
  if (!process.env.SENTRY_DSN) {
    return;
  }

  // Extract error information
  const errorName = context.resendError?.name || error?.name || 'ResendError';
  const errorMessage = context.resendError?.message || error?.message || 'Unknown Resend error';
  const statusCode = context.resendError?.statusCode || error?.statusCode;

  // Determine error type from status code or error name
  let errorType = 'unknown';
  if (statusCode === 429 || errorName === 'rate_limit_exceeded') {
    errorType = 'rate_limit_exceeded';
  } else if (statusCode === 401 || statusCode === 403) {
    errorType = 'authentication_error';
  } else if (statusCode === 400) {
    errorType = 'bad_request';
  } else if (statusCode === 404) {
    errorType = 'not_found';
  } else if (statusCode >= 500) {
    errorType = 'server_error';
  }

  // Create a proper Error object if needed
  const errorToCapture = error instanceof Error 
    ? error 
    : new Error(errorMessage);

  // Capture in Sentry with detailed context
  Sentry.captureException(errorToCapture, {
    tags: {
      component: 'email_sender',
      service: 'resend',
      error_type: errorType,
      email_type: context.emailType || 'unknown',
      has_digest_id: !!context.digestId,
      has_digest_run_id: !!context.digestRunId,
      has_recipient: !!context.recipient,
    },
    extra: {
      resend_error: {
        name: errorName,
        message: errorMessage,
        statusCode: statusCode,
        ...(context.resendError || {}),
      },
      context: {
        digestId: context.digestId,
        digestRunId: context.digestRunId,
        recipient: context.recipient,
        emailType: context.emailType,
      },
      has_api_key: !!process.env.RESEND_API_KEY,
    },
    level: errorType === 'rate_limit_exceeded' ? 'warning' : 'error',
  });

  // Log for debugging
  logger.debug(`[Sentry] Captured Resend error: ${errorType} - ${errorMessage}`, {
    errorType,
    statusCode,
    digestId: context.digestId,
    recipient: context.recipient,
  });
}

export class EmailSender {
  private resend: Resend;
  private renderer: EmailRenderer;
  private db = getDb();
  private rateLimiter = getResendRateLimiter();

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

          // Send email via Resend with rate limiting and retry logic
          const response = await this.rateLimiter.execute(async () => {
            return await this.resend.emails.send({
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
          }, { recipient });

          if (response.error) {
            // Extract error details (handle optional properties safely)
            const resendError = {
              name: response.error.name || 'UnknownError',
              message: response.error.message || 'Unknown error',
              statusCode: (response.error as any).statusCode as number | undefined,
            };

            // Capture error in Sentry with detailed context
            // Note: Rate limit errors (429) should be rare now thanks to rate limiter,
            // but we still capture them for monitoring
            captureResendErrorInSentry(response.error, {
              digestId: digestInfo.id,
              digestRunId,
              recipient,
              emailType: 'digest',
              resendError,
            });

            // Provide more detailed error message based on error type
            // Note: 429 errors should be retried automatically by rate limiter,
            // so if we reach here, all retries have been exhausted
            if (resendError.statusCode === 429 || resendError.name === 'rate_limit_exceeded') {
              throw new Error(`Rate limit dépassé après plusieurs tentatives: ${resendError.message || 'Trop de requêtes. Limite de 2 requêtes par seconde.'}`);
            } else if (resendError.statusCode === 401 || resendError.statusCode === 403 || 
                       resendError.message?.includes('401') || resendError.message?.includes('403') ||
                       resendError.message?.includes('invalid') || resendError.message?.includes('unauthorized')) {
              throw new Error('Clé API Resend invalide ou manquante. Vérifiez la configuration RESEND_API_KEY.');
            } else if (resendError.statusCode === 400) {
              throw new Error(`Requête invalide: ${resendError.message || 'Vérifiez les paramètres de l\'email.'}`);
            } else if (resendError.statusCode === 404) {
              throw new Error(`Ressource non trouvée: ${resendError.message || 'Vérifiez la configuration du domaine d\'envoi.'}`);
            } else if (resendError.statusCode >= 500) {
              throw new Error(`Erreur serveur Resend: ${resendError.message || 'Erreur temporaire du service Resend.'}`);
            }
            throw new Error(resendError.message || 'Erreur lors de l\'envoi de l\'email');
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

          // Capture error in Sentry if not already captured (for non-Resend errors)
          // Resend errors are already captured above, but network errors, etc. need to be captured here
          if (process.env.SENTRY_DSN) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            // Only capture if it's not a Resend error (those are already captured above)
            if (!errorMessage.includes('Rate limit') && 
                !errorMessage.includes('Clé API Resend') &&
                !errorMessage.includes('rate_limit_exceeded')) {
              captureResendErrorInSentry(error, {
                digestId: digestInfo.id,
                digestRunId,
                recipient,
                emailType: 'digest',
              });
            }
          }

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

      // Send email via Resend with rate limiting and retry logic
      const response = await this.rateLimiter.execute(async () => {
        return await this.resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'noreply@mediagrade.grand-shooting.com',
          to: recipient,
          subject,
          html: rendered.bodyHtml,
          text: rendered.bodyText,
          tags: [
            { name: 'type', value: 'test' },
            { name: 'account_id', value: digestInfo.accountId }
          ]
        });
      }, { recipient });

      if (response.error) {
        // Extract error details (handle optional properties safely)
        const resendError = {
          name: response.error.name || 'UnknownError',
          message: response.error.message || 'Unknown error',
          statusCode: (response.error as any).statusCode as number | undefined,
        };

        // Capture error in Sentry with detailed context
        captureResendErrorInSentry(response.error, {
          recipient,
          emailType: 'test',
          resendError,
        });

        // Provide more detailed error message based on error type
        if (resendError.statusCode === 429 || resendError.name === 'rate_limit_exceeded') {
          throw new Error(`Rate limit dépassé: ${resendError.message || 'Trop de requêtes. Limite de 2 requêtes par seconde.'}`);
        } else if (resendError.statusCode === 401 || resendError.statusCode === 403 || 
                   resendError.message?.includes('401') || resendError.message?.includes('403') ||
                   resendError.message?.includes('invalid') || resendError.message?.includes('unauthorized')) {
          throw new Error('Clé API Resend invalide ou manquante. Vérifiez la configuration RESEND_API_KEY.');
        } else if (resendError.statusCode === 400) {
          throw new Error(`Requête invalide: ${resendError.message || 'Vérifiez les paramètres de l\'email.'}`);
        } else if (resendError.statusCode === 404) {
          throw new Error(`Ressource non trouvée: ${resendError.message || 'Vérifiez la configuration du domaine d\'envoi.'}`);
        } else if (resendError.statusCode >= 500) {
          throw new Error(`Erreur serveur Resend: ${resendError.message || 'Erreur temporaire du service Resend.'}`);
        }
        throw new Error(resendError.message || 'Erreur lors de l\'envoi de l\'email');
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

      // Capture error in Sentry if not already captured (for non-Resend errors)
      // Resend errors are already captured above, but network errors, etc. need to be captured here
      if (process.env.SENTRY_DSN) {
        // Only capture if it's not a Resend error (those are already captured above)
        if (!errorMessage.includes('Rate limit') && 
            !errorMessage.includes('Clé API Resend') &&
            !errorMessage.includes('rate_limit_exceeded')) {
          captureResendErrorInSentry(error, {
            recipient,
            emailType: 'test',
          });
        }
      }

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