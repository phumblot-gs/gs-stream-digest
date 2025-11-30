import { pgTable, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';

// Email templates for digests
export const emailTemplates = pgTable('digest_email_templates', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),

  // Template ownership
  accountId: text('account_id'), // null = global template
  isGlobal: boolean('is_global').default(false).notNull(),
  isDefault: boolean('is_default').default(false).notNull(),

  // Liquid templates
  subjectLiquid: text('subject_liquid').notNull(),
  bodyHtmlLiquid: text('body_html_liquid').notNull(),
  bodyTextLiquid: text('body_text_liquid'),

  // Preview data for testing
  previewData: text('preview_data'), // JSON with example events

  // Metadata
  createdBy: text('created_by').notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow()
}, (table) => ({
  accountIdx: index('idx_email_templates_account').on(table.accountId),
  globalIdx: index('idx_email_templates_global').on(table.isGlobal)
}));

// Type exports
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type NewEmailTemplate = typeof emailTemplates.$inferInsert;
