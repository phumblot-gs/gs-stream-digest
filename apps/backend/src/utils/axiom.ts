import { Axiom } from '@axiomhq/js';
import { logger } from './logger';

let axiom: Axiom | null = null;
let dataset: string | null = null;

export function initializeAxiom(): Axiom | null {
  const token = process.env.AXIOM_TOKEN;

  if (!token) {
    logger.warn('AXIOM_TOKEN not configured, Axiom logging disabled');
    return null;
  }

  // Determine dataset based on NODE_ENV
  const env = process.env.NODE_ENV || 'development';
  if (env === 'production') {
    dataset = 'gs-production';
  } else if (env === 'staging') {
    dataset = 'gs-staging';
  } else {
    dataset = 'gs-dev';
  }

  axiom = new Axiom({
    token,
  });

  logger.info(`Axiom initialized with dataset: ${dataset}`);
  return axiom;
}

export function getAxiom(): Axiom | null {
  return axiom;
}

export async function logEvent(event: string, data: any) {
  if (!axiom || !dataset) {
    logger.debug(`Axiom not configured, skipping event: ${event}`);
    return;
  }

  try {
    await axiom.ingest(dataset, [
      {
        _time: new Date().toISOString(),
        event,
        ...data,
      },
    ]);
    logger.debug(`Logged event to Axiom (${dataset}): ${event}`);
  } catch (error) {
    logger.error(`Failed to log event to Axiom: ${event}`, error);
  }
}