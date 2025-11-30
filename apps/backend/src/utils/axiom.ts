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

  // Determine dataset with priority:
  // 1. Explicit AXIOM_DATASET env var (highest priority)
  // 2. FLY_APP_NAME (most reliable on Fly.io - contains staging/production)
  // 3. NODE_ENV (fallback)
  if (process.env.AXIOM_DATASET) {
    dataset = process.env.AXIOM_DATASET;
    console.log(`[Axiom] Using explicit AXIOM_DATASET: ${dataset}`);
  } else {
    // Check FLY_APP_NAME first (most reliable on Fly.io)
    // staging app: 'gs-stream-digest-staging' → 'gs-staging'
    // production app: 'gs-stream-digest' → 'gs-production'
    const flyAppName = process.env.FLY_APP_NAME || '';
    const appNameLower = flyAppName.toLowerCase();
    
    if (appNameLower.includes('staging')) {
      dataset = 'gs-staging';
      console.log(`[Axiom] Detected staging from FLY_APP_NAME: ${flyAppName} → dataset: ${dataset}`);
    } else if (appNameLower.includes('production') || appNameLower.includes('prod') || (flyAppName && !appNameLower.includes('staging'))) {
      // If FLY_APP_NAME exists and doesn't contain 'staging', assume production
      // This handles the case where production app is just 'gs-stream-digest'
      dataset = 'gs-production';
      console.log(`[Axiom] Detected production from FLY_APP_NAME: ${flyAppName} → dataset: ${dataset}`);
    } else {
      // Fallback to NODE_ENV
      const env = process.env.NODE_ENV || 'development';
      if (env === 'production') {
        dataset = 'gs-production';
      } else if (env === 'staging') {
        dataset = 'gs-staging';
      } else {
        dataset = 'gs-dev';
      }
      console.log(`[Axiom] Using NODE_ENV fallback: ${env} → dataset: ${dataset}`);
    }
  }

  try {
    axiom = new Axiom({
      token,
    });

    console.log(`[Axiom] ✅ Initialized with dataset: ${dataset}`);
    console.log(`[Axiom] FLY_APP_NAME: ${process.env.FLY_APP_NAME || '[NOT SET]'}`);
    console.log(`[Axiom] NODE_ENV: ${process.env.NODE_ENV || '[NOT SET]'}`);
    console.log(`[Axiom] Token length: ${token.length} chars`);
    console.log(`[Axiom] Logs will be sent via logger queue system`);
    
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error({ err: error }, `Failed to log event to Axiom: ${event} - ${errorMessage}`);
  }
}
