import * as Sentry from '@sentry/node';
import { logger } from './logger';

export function initializeSentry() {
  const dsn = process.env.SENTRY_DSN;
  
  if (dsn) {
    try {
      Sentry.init({
        dsn,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        // Setting this option to true will send default PII data to Sentry
        sendDefaultPii: true,
        // Capture unhandled rejections
        captureUnhandledRejections: true,
        // Capture uncaught exceptions
        beforeSend(event) {
          console.log('[Sentry] Capturing error:', event.exception?.values?.[0]?.value);
          return event;
        },
      });

      console.log('[Sentry] ✅ Initialized successfully');
      console.log('[Sentry] Environment:', process.env.NODE_ENV || 'development');
      
      // Test Sentry by capturing a test message
      Sentry.captureMessage('Sentry initialization test', 'info');
    } catch (error) {
      console.error('[Sentry] ❌ Failed to initialize:', error);
    }
  } else {
    console.warn('[Sentry] ⚠️  SENTRY_DSN not provided, error tracking disabled');
    console.warn('[Sentry] Available env vars:', Object.keys(process.env).filter(k => k.includes('SENTRY')));
  }
}

export { Sentry };