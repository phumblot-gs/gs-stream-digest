import * as Sentry from '@sentry/node';
import { logger } from './logger';

export function initializeSentry() {
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      // Setting this option to true will send default PII data to Sentry
      sendDefaultPii: true,
    });

    logger.info('Sentry initialized');
  } else {
    logger.warn('Sentry DSN not provided, error tracking disabled');
  }
}

export { Sentry };