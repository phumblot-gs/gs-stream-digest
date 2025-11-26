import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Email templates for digests
export const emailTemplates = sqliteTable('email_templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),

  // Template ownership
  accountId: text('account_id'), // null = global template
  isGlobal: integer('is_global', { mode: 'boolean' }).default(false).notNull(),
  isDefault: integer('is_default', { mode: 'boolean' }).default(false).notNull(),

  // Liquid templates
  subjectLiquid: text('subject_liquid').notNull(),
  bodyHtmlLiquid: text('body_html_liquid').notNull(),
  bodyTextLiquid: text('body_text_liquid'),

  // Preview data for testing
  previewData: text('preview_data'), // JSON with example events

  // Metadata
  createdBy: text('created_by').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
}, (table) => ({
  accountIdx: index('idx_email_templates_account').on(table.accountId),
  globalIdx: index('idx_email_templates_global').on(table.isGlobal)
}));