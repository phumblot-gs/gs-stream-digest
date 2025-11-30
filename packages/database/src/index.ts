export { getDb, resetDb } from './client';

// Always export PostgreSQL schemas for now since we're using PostgreSQL locally and on staging
// This avoids the timestamp conversion issues completely
export { digests, accounts } from './schema-pg/digests';
export { applications, eventTypes } from './schema-pg/admin';
export { templates, templates as digestTemplates } from './schema-pg/templates';

// Export types (these are the same for both)
export type { Digest, Account, NewDigest, NewAccount } from './schema/digests';
export type { Application, EventType, NewApplication, NewEventType } from './schema/admin';
export type { Template, NewTemplate } from './schema/templates';

// IMPORTANT: Do not export a pre-initialized db instance here!
// It would be called at module load time, before environment variables are loaded.
// Always use getDb() instead in your code.