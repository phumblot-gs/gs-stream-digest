import { logger } from './logger';

// Note: Axiom integration temporarily disabled due to API changes
// TODO: Update to latest Axiom API

<<<<<<< Updated upstream
export function initializeAxiom(): null {
  logger.warn('Axiom integration disabled');
  return null;
=======
export function initializeAxiom(): Axiom | null {
  const token = process.env.AXIOM_API_KEY || process.env.AXIOM_TOKEN;

  if (!token) {
    logger.warn('AXIOM_API_KEY not configured, Axiom logging disabled');
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

  try {
    axiom = new Axiom({
      token,
    });

    logger.info({ 
      event: 'axiom_initialized',
      dataset,
      env,
      hasToken: !!token,
      tokenLength: token?.length || 0,
    }, `Axiom initialized with dataset: ${dataset}`);
    
    return axiom;
  } catch (error) {
    logger.error({ 
      event: 'axiom_init_failed',
      error: error instanceof Error ? error.message : String(error),
    }, 'Failed to initialize Axiom');
    return null;
  }
>>>>>>> Stashed changes
}

export function getAxiom(): null {
  return null;
}

<<<<<<< Updated upstream
export async function logEvent(event: string, _data: any) {
  // Axiom logging disabled
  logger.debug(`Would log event to Axiom: ${event}`);
=======
export function getDataset(): string | null {
  return dataset;
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
>>>>>>> Stashed changes
}