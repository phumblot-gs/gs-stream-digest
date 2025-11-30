import { pgTable, text, boolean, timestamp } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

// Applications table
export const applications = pgTable('digest_applications', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  label: text('label').notNull(), // Display label (e.g., "GS Sourcing")
  value: text('value').notNull().unique(), // Filter value (e.g., "sourcing")
  description: text('description'), // Optional description
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { mode: 'date' }).$defaultFn(() => new Date()),
  updatedAt: timestamp('updated_at', { mode: 'date' }).$defaultFn(() => new Date()),
  createdBy: text('created_by'), // User ID who created this
});

// Event types table
export const eventTypes = pgTable('digest_event_types', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  label: text('label').notNull(), // Display label (e.g., "Partage de fichier")
  value: text('value').notNull().unique(), // Filter value (e.g., "file.share")
  description: text('description'), // Optional description
  category: text('category'), // Optional category for grouping
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { mode: 'date' }).$defaultFn(() => new Date()),
  updatedAt: timestamp('updated_at', { mode: 'date' }).$defaultFn(() => new Date()),
  createdBy: text('created_by'), // User ID who created this
});

// Type exports
export type Application = typeof applications.$inferSelect;
export type NewApplication = typeof applications.$inferInsert;
export type EventType = typeof eventTypes.$inferSelect;
export type NewEventType = typeof eventTypes.$inferInsert;
