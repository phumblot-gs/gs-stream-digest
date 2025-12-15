import * as Sentry from '@sentry/node';
import { logger } from './logger';

export function initializeSentry() {
  const dsn = process.env.SENTRY_DSN;
  
  if (dsn) {
    try {
      // Extract project ID from DSN for logging (without exposing full DSN)
      const dsnParts = dsn.match(/https:\/\/([^@]+)@([^/]+)\/(.+)/);
      const projectId = dsnParts ? dsnParts[3] : 'unknown';
      const sentryHost = dsnParts ? dsnParts[2] : 'unknown';
      
      Sentry.init({
        dsn,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        // Setting this option to true will send default PII data to Sentry
        sendDefaultPii: true,
        // Capture unhandled rejections
        captureUnhandledRejections: true,
        // Enable debug mode in development to see what's happening
        debug: process.env.NODE_ENV === 'development',
        // Before sending event to Sentry
        beforeSend(event, hint) {
          const errorMessage = event.exception?.values?.[0]?.value || event.message?.message || 'Unknown error';
          console.log('[Sentry] 📤 beforeSend - Preparing to send event:', {
            eventId: event.event_id,
            message: errorMessage,
            level: event.level,
            environment: event.environment,
            tags: event.tags,
          });
          return event;
        },
        // Handle errors when sending to Sentry
        transportOptions: {
          // Add custom headers or handle errors
        },
        // Handle transport errors
        onError: (error) => {
          console.error('[Sentry] ❌ Error sending event to Sentry:', error);
          console.error('[Sentry] Error details:', {
            message: error.message,
            stack: error.stack,
            code: (error as any).code,
            statusCode: (error as any).statusCode,
          });
        },
        // After sending event (or failing to send)
        beforeSendTransaction(event) {
          console.log('[Sentry] 📤 beforeSendTransaction:', event.transaction);
          return event;
        },
      });

      console.log('[Sentry] ✅ Initialized successfully');
      console.log('[Sentry] Environment:', process.env.NODE_ENV || 'development');
      console.log('[Sentry] Project ID:', projectId);
      console.log('[Sentry] Sentry Host:', sentryHost);
      console.log('[Sentry] Debug mode:', process.env.NODE_ENV === 'development' ? 'enabled' : 'disabled');
    } catch (error) {
      console.error('[Sentry] ❌ Failed to initialize:', error);
    }
  } else {
    console.warn('[Sentry] ⚠️  SENTRY_DSN not provided, error tracking disabled');
    console.warn('[Sentry] Available env vars:', Object.keys(process.env).filter(k => k.includes('SENTRY')));
  }
}

export { Sentry };