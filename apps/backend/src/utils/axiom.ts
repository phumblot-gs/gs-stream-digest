import { logger } from './logger';

// Note: Axiom integration temporarily disabled due to API changes
// TODO: Update to latest Axiom API

export function initializeAxiom(): null {
  logger.warn('Axiom integration disabled');
  return null;
}

export function getAxiom(): null {
  return null;
}

export async function logEvent(event: string, _data: any) {
  // Axiom logging disabled
  logger.debug(`Would log event to Axiom: ${event}`);
}