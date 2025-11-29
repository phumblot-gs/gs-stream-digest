import { pgTable, text, integer, index, timestamp, boolean } from 'drizzle-orm/pg-core';

// Main digests table
export const digests = pgTable('digest_digests', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  accountId: text('account_id').notNull(),

  // Filters as JSON
  filters: text('filters').notNull().default('{}'), // EventFilters type

  // Schedule configuration
  schedule: text('schedule').notNull(), // Cron expression or predefined schedule
  timezone: text('timezone').notNull().default('Europe/Paris'),

  // Recipients as JSON array
  recipients: text('recipients').notNull().default('[]'), // string[]
  testRecipients: text('test_recipients').default('[]'), // string[] for dry-run

  // Template reference
  templateId: text('template_id').references(() => digestTemplates.id),

  // Event tracking
  lastEventUid: text('last_event_uid'),
  lastCheckAt: timestamp('last_check_at', { mode: 'date' }),

  // Status
  isActive: boolean('is_active').default(true).notNull(),
  isPaused: boolean('is_paused').default(false).notNull(),

  // User who created the digest
  createdBy: text('created_by').notNull(),

  // Timestamps
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow()
}, (table) => ({
  accountIdx: index('idx_digests_account').on(table.accountId),
  activeIdx: index('idx_digests_active').on(table.isActive),
  templateIdx: index('idx_digests_template').on(table.templateId)
}));

// Digest templates
export const digestTemplates = pgTable('digest_templates', {
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
  accountIdx: index('idx_templates_account').on(table.accountId),
  globalIdx: index('idx_templates_global').on(table.isGlobal)
}));

// Digest run history
export const digestRuns = pgTable('digest_runs', {
  id: text('id').primaryKey(),
  digestId: text('digest_id').notNull().references(() => digests.id, { onDelete: 'cascade' }),

  // Run details
  runAt: timestamp('run_at', { mode: 'date' }).notNull().defaultNow(),
  runType: text('run_type').notNull().default('scheduled'), // 'scheduled', 'manual', 'test'

  // Event data
  eventsCount: integer('events_count').notNull().default(0),
  events: text('events').notNull().default('[]'), // JSON array of events
  eventUidStart: text('event_uid_start'),
  eventUidEnd: text('event_uid_end'),

  // Email stats
  emailsSent: integer('emails_sent').notNull().default(0),
  emailsFailed: integer('emails_failed').notNull().default(0),

  // Status
  status: text('status').notNull().default('pending'), // 'pending', 'processing', 'success', 'failed', 'partial'
  error: text('error'),

  // Performance metrics
  durationMs: integer('duration_ms'),

  // Who triggered the run (for manual runs)
  triggeredBy: text('triggered_by'),

  completedAt: timestamp('completed_at', { mode: 'date' })
}, (table) => ({
  digestIdx: index('idx_runs_digest').on(table.digestId),
  dateIdx: index('idx_runs_date').on(table.runAt),
  statusIdx: index('idx_runs_status').on(table.status)
}));

// Email send logs
export const emailLogs = pgTable('digest_email_logs', {
  id: text('id').primaryKey(),
  digestRunId: text('digest_run_id').notNull().references(() => digestRuns.id, { onDelete: 'cascade' }),

  // Email details
  recipient: text('recipient').notNull(),
  subject: text('subject').notNull(),

  // Resend integration
  resendId: text('resend_id').unique(),
  resendStatus: text('resend_status'), // Resend's status

  // Status tracking
  status: text('status').notNull().default('pending'), // 'pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed'

  // Timestamps for events
  sentAt: timestamp('sent_at', { mode: 'date' }),
  deliveredAt: timestamp('delivered_at', { mode: 'date' }),
  openedAt: timestamp('opened_at', { mode: 'date' }),
  firstOpenedAt: timestamp('first_opened_at', { mode: 'date' }),
  clickedAt: timestamp('clicked_at', { mode: 'date' }),
  bouncedAt: timestamp('bounced_at', { mode: 'date' }),

  // Error tracking
  error: text('error'),

  // Metrics
  openCount: integer('open_count').default(0),
  clickCount: integer('click_count').default(0),

  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow()
}, (table) => ({
  runIdx: index('idx_emails_run').on(table.digestRunId),
  recipientIdx: index('idx_emails_recipient').on(table.recipient),
  resendIdx: index('idx_emails_resend').on(table.resendId),
  statusIdx: index('idx_emails_status').on(table.status)
}));

// API Keys for external access
export const apiKeys = pgTable('digest_api_keys', {
  id: text('id').primaryKey(),

  // Key details
  name: text('name').notNull(),
  keyHash: text('key_hash').notNull().unique(), // SHA256 hash of the key
  keyPrefix: text('key_prefix').notNull(), // First 8 chars for identification

  // Ownership and permissions
  userId: text('user_id').notNull(),
  accountId: text('account_id').notNull(),
  role: text('role').notNull(), // 'superadmin', 'admin', 'viewer'

  // Rate limiting
  rateLimit: integer('rate_limit').notNull().default(60), // requests per minute

  // Usage tracking
  lastUsedAt: timestamp('last_used_at', { mode: 'date' }),
  lastUsedIp: text('last_used_ip'),
  useCount: integer('use_count').default(0),

  // Lifecycle
  expiresAt: timestamp('expires_at', { mode: 'date' }),
  revokedAt: timestamp('revoked_at', { mode: 'date' }),
  revokedBy: text('revoked_by'),
  revokeReason: text('revoke_reason'),

  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  createdBy: text('created_by').notNull()
}, (table) => ({
  userIdx: index('idx_keys_user').on(table.userId),
  accountIdx: index('idx_keys_account').on(table.accountId),
  prefixIdx: index('idx_keys_prefix').on(table.keyPrefix)
}));

// Webhook events from Resend
export const webhookEvents = pgTable('digest_webhook_events', {
  id: text('id').primaryKey(),

  // Event details
  eventType: text('event_type').notNull(), // 'email.sent', 'email.delivered', 'email.opened', etc.
  eventId: text('event_id').notNull().unique(), // Resend's event ID

  // Email reference
  emailLogId: text('email_log_id').references(() => emailLogs.id),
  resendId: text('resend_id'),

  // Event data
  payload: text('payload').notNull(), // Full JSON payload

  // Processing
  processed: boolean('processed').default(false).notNull(),
  processedAt: timestamp('processed_at', { mode: 'date' }),
  error: text('error'),

  receivedAt: timestamp('received_at', { mode: 'date' }).notNull().defaultNow()
}, (table) => ({
  emailLogIdx: index('idx_webhook_email').on(table.emailLogId),
  eventTypeIdx: index('idx_webhook_type').on(table.eventType),
  processedIdx: index('idx_webhook_processed').on(table.processed)
}));

// Type exports
export type Digest = typeof digests.$inferSelect;
export type NewDigest = typeof digests.$inferInsert;
export type DigestTemplate = typeof digestTemplates.$inferSelect;
export type NewDigestTemplate = typeof digestTemplates.$inferInsert;
export type DigestRun = typeof digestRuns.$inferSelect;
export type NewDigestRun = typeof digestRuns.$inferInsert;
export type EmailLog = typeof emailLogs.$inferSelect;
export type NewEmailLog = typeof emailLogs.$inferInsert;
export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type NewWebhookEvent = typeof webhookEvents.$inferInsert;
