import { Axiom } from '@axiomhq/js';
import { logger } from './logger';

let axiom: Axiom | null = null;
let dataset: string | null = null;

export function initializeAxiom(): Axiom | null {
  const token = process.env.AXIOM_API_KEY || process.env.AXIOM_TOKEN;

  if (!token) {
    console.warn('[Axiom] AXIOM_API_KEY not configured, Axiom logging disabled');
    console.warn('[Axiom] Available env vars:', Object.keys(process.env).filter(k => k.includes('AXIOM')));
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

    console.log(`[Axiom] ✅ Initialized with dataset: ${dataset}, env: ${env}`);
    console.log(`[Axiom] Token length: ${token.length} chars`);
    
    // Test connection by sending a test log
    axiom.ingest(dataset, [{
      _time: new Date().toISOString(),
      event: 'axiom_test',
      message: 'Axiom connection test',
      env,
    }]).then(() => {
      console.log(`[Axiom] ✅ Test log sent successfully to ${dataset}`);
    }).catch((err) => {
      console.error(`[Axiom] ❌ Failed to send test log:`, err);
    });
    
    return axiom;
  } catch (error) {
    console.error('[Axiom] ❌ Failed to initialize:', error);
    return null;
  }
}

export function getAxiom(): Axiom | null {
  return axiom;
}

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
}
