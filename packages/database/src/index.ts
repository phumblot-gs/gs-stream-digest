export { getDb, resetDb } from './client';

// Always export PostgreSQL schemas for now since we're using PostgreSQL locally and on staging
// This avoids the timestamp conversion issues completely
export { digests, digestTemplates, digestRuns, emailLogs, apiKeys, webhookEvents } from './schema-pg/digests';
export { applications, eventTypes } from './schema-pg/admin';
export { emailTemplates, emailTemplates as templates } from './schema-pg/templates';

// Export schema object for convenience (used in some files)
import * as digestSchemas from './schema-pg/digests';
import * as adminSchemas from './schema-pg/admin';
import * as templateSchemas from './schema-pg/templates';

export const schema = {
  ...digestSchemas,
  ...adminSchemas,
  ...templateSchemas,
};

// Export types from PostgreSQL schemas now that we're using them
export type { Digest, NewDigest, DigestTemplate, NewDigestTemplate, DigestRun, NewDigestRun, EmailLog, NewEmailLog, ApiKey, NewApiKey, WebhookEvent, NewWebhookEvent } from './schema-pg/digests';
export type { Application, EventType, NewApplication, NewEventType } from './schema-pg/admin';
export type { EmailTemplate, NewEmailTemplate } from './schema-pg/templates';

// Alias the types for backward compatibility
export type { EmailTemplate as Template, NewEmailTemplate as NewTemplate } from './schema-pg/templates';

// IMPORTANT: Do not export a pre-initialized db instance here!
// It would be called at module load time, before environment variables are loaded.
// Always use getDb() instead in your code.