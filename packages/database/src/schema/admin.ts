import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { createId } from '@paralleldrive/cuid2';

// Applications table
export const applications = sqliteTable('digest_applications', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  label: text('label').notNull(), // Display label (e.g., "GS Sourcing")
  value: text('value').notNull().unique(), // Filter value (e.g., "sourcing")
  description: text('description'), // Optional description
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  createdBy: text('created_by'), // User ID who created this
});

// Event types table
export const eventTypes = sqliteTable('digest_event_types', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  label: text('label').notNull(), // Display label (e.g., "Partage de fichier")
  value: text('value').notNull().unique(), // Filter value (e.g., "file.share")
  description: text('description'), // Optional description
  category: text('category'), // Optional category for grouping
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  createdBy: text('created_by'), // User ID who created this
});

// Type exports
export type Application = typeof applications.$inferSelect;
export type NewApplication = typeof applications.$inferInsert;
export type EventType = typeof eventTypes.$inferSelect;
export type NewEventType = typeof eventTypes.$inferInsert;