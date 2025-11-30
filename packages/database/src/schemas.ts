// This file provides conditional schema exports based on database type
import * as digestsSqlite from './schema/digests';
import * as adminSqlite from './schema/admin';
import * as templatesSqlite from './schema/templates';

import * as digestsPg from './schema-pg/digests';
import * as adminPg from './schema-pg/admin';
import * as templatesPg from './schema-pg/templates';

// Helper function to check if we're using PostgreSQL
const isPostgreSQL = () => !!process.env.DATABASE_URL;

// Export the correct schema based on environment
export const digests = isPostgreSQL() ? digestsPg.digests : digestsSqlite.digests;
export const digestContents = isPostgreSQL() ? digestsPg.digestContents : digestsSqlite.digestContents;
export const digestsToContents = isPostgreSQL() ? digestsPg.digestsToContents : digestsSqlite.digestsToContents;

export const applications = isPostgreSQL() ? adminPg.applications : adminSqlite.applications;
export const eventTypes = isPostgreSQL() ? adminPg.eventTypes : adminSqlite.eventTypes;

export const digestTemplates = isPostgreSQL() ? templatesPg.digestTemplates : templatesSqlite.digestTemplates;
export const templateStyles = isPostgreSQL() ? templatesPg.templateStyles : templatesSqlite.templateStyles;

// Type exports (these should be the same for both)
export type { Digest, NewDigest, DigestContent, NewDigestContent, DigestToContent } from './schema/digests';
export type { Application, NewApplication, EventType, NewEventType } from './schema/admin';
export type { DigestTemplate, NewDigestTemplate, TemplateStyle } from './schema/templates';