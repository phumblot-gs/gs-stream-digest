export { getDb, resetDb } from './client';
export * from './schema/digests';
export * from './schema/admin';
export * from './schema/templates';

// IMPORTANT: Do not export a pre-initialized db instance here!
// It would be called at module load time, before environment variables are loaded.
// Always use getDb() instead in your code.