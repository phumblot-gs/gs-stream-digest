export * from './client';
export * from './schema/digests';
export * from './schema/admin';
export * from './schema/templates';

// Export db instance directly for convenience
import { getDb } from './client';
export const db = getDb();