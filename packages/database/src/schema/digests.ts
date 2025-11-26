import { sqliteTable, text, integer, index, primaryKey } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// Main digests table
export const digests = sqliteTable('digests', {
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
  lastCheckAt: integer('last_check_at', { mode: 'timestamp' }),

  // Status
  isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
  isPaused: integer('is_paused', { mode: 'boolean' }).default(false).notNull(),

  // User who created the digest
  createdBy: text('created_by').notNull(),

  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
}, (table) => ({
  accountIdx: index('idx_digests_account').on(table.accountId),
  activeIdx: index('idx_digests_active').on(table.isActive),
  templateIdx: index('idx_digests_template').on(table.templateId)
}));

// Digest templates
export const digestTemplates = sqliteTable('digest_templates', {
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
  accountIdx: index('idx_templates_account').on(table.accountId),
  globalIdx: index('idx_templates_global').on(table.isGlobal)
}));

// Digest run history
export const digestRuns = sqliteTable('digest_runs', {
  id: text('id').primaryKey(),
  digestId: text('digest_id').notNull().references(() => digests.id, { onDelete: 'cascade' }),

  // Run details
  runAt: integer('run_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
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

  completedAt: integer('completed_at', { mode: 'timestamp' })
}, (table) => ({
  digestIdx: index('idx_runs_digest').on(table.digestId),
  dateIdx: index('idx_runs_date').on(table.runAt),
  statusIdx: index('idx_runs_status').on(table.status)
}));

// Email send logs
export const emailLogs = sqliteTable('email_logs', {
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
  sentAt: integer('sent_at', { mode: 'timestamp' }),
  deliveredAt: integer('delivered_at', { mode: 'timestamp' }),
  openedAt: integer('opened_at', { mode: 'timestamp' }),
  firstOpenedAt: integer('first_opened_at', { mode: 'timestamp' }),
  clickedAt: integer('clicked_at', { mode: 'timestamp' }),
  bouncedAt: integer('bounced_at', { mode: 'timestamp' }),

  // Error tracking
  error: text('error'),

  // Metrics
  openCount: integer('open_count').default(0),
  clickCount: integer('click_count').default(0),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
}, (table) => ({
  runIdx: index('idx_emails_run').on(table.digestRunId),
  recipientIdx: index('idx_emails_recipient').on(table.recipient),
  resendIdx: index('idx_emails_resend').on(table.resendId),
  statusIdx: index('idx_emails_status').on(table.status)
}));

// API Keys for external access
export const apiKeys = sqliteTable('api_keys', {
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
  lastUsedAt: integer('last_used_at', { mode: 'timestamp' }),
  lastUsedIp: text('last_used_ip'),
  useCount: integer('use_count').default(0),

  // Lifecycle
  expiresAt: integer('expires_at', { mode: 'timestamp' }),
  revokedAt: integer('revoked_at', { mode: 'timestamp' }),
  revokedBy: text('revoked_by'),
  revokeReason: text('revoke_reason'),

  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  createdBy: text('created_by').notNull()
}, (table) => ({
  userIdx: index('idx_keys_user').on(table.userId),
  accountIdx: index('idx_keys_account').on(table.accountId),
  prefixIdx: index('idx_keys_prefix').on(table.keyPrefix)
}));

// Webhook events from Resend
export const webhookEvents = sqliteTable('webhook_events', {
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
  processed: integer('processed', { mode: 'boolean' }).default(false).notNull(),
  processedAt: integer('processed_at', { mode: 'timestamp' }),
  error: text('error'),

  receivedAt: integer('received_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
}, (table) => ({
  emailLogIdx: index('idx_webhook_email').on(table.emailLogId),
  eventTypeIdx: index('idx_webhook_type').on(table.eventType),
  processedIdx: index('idx_webhook_processed').on(table.processed)
}));