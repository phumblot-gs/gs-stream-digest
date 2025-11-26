"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.webhookEvents = exports.apiKeys = exports.emailLogs = exports.digestRuns = exports.digestTemplates = exports.digests = void 0;
const sqlite_core_1 = require("drizzle-orm/sqlite-core");
const drizzle_orm_1 = require("drizzle-orm");
// Main digests table
exports.digests = (0, sqlite_core_1.sqliteTable)('digests', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    name: (0, sqlite_core_1.text)('name').notNull(),
    description: (0, sqlite_core_1.text)('description'),
    accountId: (0, sqlite_core_1.text)('account_id').notNull(),
    // Filters as JSON
    filters: (0, sqlite_core_1.text)('filters').notNull().default('{}'), // EventFilters type
    // Schedule configuration
    schedule: (0, sqlite_core_1.text)('schedule').notNull(), // Cron expression or predefined schedule
    timezone: (0, sqlite_core_1.text)('timezone').notNull().default('Europe/Paris'),
    // Recipients as JSON array
    recipients: (0, sqlite_core_1.text)('recipients').notNull().default('[]'), // string[]
    testRecipients: (0, sqlite_core_1.text)('test_recipients').default('[]'), // string[] for dry-run
    // Template reference
    templateId: (0, sqlite_core_1.text)('template_id').references(() => exports.digestTemplates.id),
    // Event tracking
    lastEventUid: (0, sqlite_core_1.text)('last_event_uid'),
    lastCheckAt: (0, sqlite_core_1.integer)('last_check_at', { mode: 'timestamp' }),
    // Status
    isActive: (0, sqlite_core_1.integer)('is_active', { mode: 'boolean' }).default(true).notNull(),
    isPaused: (0, sqlite_core_1.integer)('is_paused', { mode: 'boolean' }).default(false).notNull(),
    // User who created the digest
    createdBy: (0, sqlite_core_1.text)('created_by').notNull(),
    // Timestamps
    createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'timestamp' }).notNull().default((0, drizzle_orm_1.sql) `(unixepoch())`),
    updatedAt: (0, sqlite_core_1.integer)('updated_at', { mode: 'timestamp' }).notNull().default((0, drizzle_orm_1.sql) `(unixepoch())`)
}, (table) => ({
    accountIdx: (0, sqlite_core_1.index)('idx_digests_account').on(table.accountId),
    activeIdx: (0, sqlite_core_1.index)('idx_digests_active').on(table.isActive),
    templateIdx: (0, sqlite_core_1.index)('idx_digests_template').on(table.templateId)
}));
// Digest templates
exports.digestTemplates = (0, sqlite_core_1.sqliteTable)('digest_templates', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    name: (0, sqlite_core_1.text)('name').notNull(),
    description: (0, sqlite_core_1.text)('description'),
    // Template ownership
    accountId: (0, sqlite_core_1.text)('account_id'), // null = global template
    isGlobal: (0, sqlite_core_1.integer)('is_global', { mode: 'boolean' }).default(false).notNull(),
    isDefault: (0, sqlite_core_1.integer)('is_default', { mode: 'boolean' }).default(false).notNull(),
    // Liquid templates
    subjectLiquid: (0, sqlite_core_1.text)('subject_liquid').notNull(),
    bodyHtmlLiquid: (0, sqlite_core_1.text)('body_html_liquid').notNull(),
    bodyTextLiquid: (0, sqlite_core_1.text)('body_text_liquid'),
    // Preview data for testing
    previewData: (0, sqlite_core_1.text)('preview_data'), // JSON with example events
    // Metadata
    createdBy: (0, sqlite_core_1.text)('created_by').notNull(),
    createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'timestamp' }).notNull().default((0, drizzle_orm_1.sql) `(unixepoch())`),
    updatedAt: (0, sqlite_core_1.integer)('updated_at', { mode: 'timestamp' }).notNull().default((0, drizzle_orm_1.sql) `(unixepoch())`)
}, (table) => ({
    accountIdx: (0, sqlite_core_1.index)('idx_templates_account').on(table.accountId),
    globalIdx: (0, sqlite_core_1.index)('idx_templates_global').on(table.isGlobal)
}));
// Digest run history
exports.digestRuns = (0, sqlite_core_1.sqliteTable)('digest_runs', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    digestId: (0, sqlite_core_1.text)('digest_id').notNull().references(() => exports.digests.id, { onDelete: 'cascade' }),
    // Run details
    runAt: (0, sqlite_core_1.integer)('run_at', { mode: 'timestamp' }).notNull().default((0, drizzle_orm_1.sql) `(unixepoch())`),
    runType: (0, sqlite_core_1.text)('run_type').notNull().default('scheduled'), // 'scheduled', 'manual', 'test'
    // Event data
    eventsCount: (0, sqlite_core_1.integer)('events_count').notNull().default(0),
    events: (0, sqlite_core_1.text)('events').notNull().default('[]'), // JSON array of events
    eventUidStart: (0, sqlite_core_1.text)('event_uid_start'),
    eventUidEnd: (0, sqlite_core_1.text)('event_uid_end'),
    // Email stats
    emailsSent: (0, sqlite_core_1.integer)('emails_sent').notNull().default(0),
    emailsFailed: (0, sqlite_core_1.integer)('emails_failed').notNull().default(0),
    // Status
    status: (0, sqlite_core_1.text)('status').notNull().default('pending'), // 'pending', 'processing', 'success', 'failed', 'partial'
    error: (0, sqlite_core_1.text)('error'),
    // Performance metrics
    durationMs: (0, sqlite_core_1.integer)('duration_ms'),
    // Who triggered the run (for manual runs)
    triggeredBy: (0, sqlite_core_1.text)('triggered_by'),
    completedAt: (0, sqlite_core_1.integer)('completed_at', { mode: 'timestamp' })
}, (table) => ({
    digestIdx: (0, sqlite_core_1.index)('idx_runs_digest').on(table.digestId),
    dateIdx: (0, sqlite_core_1.index)('idx_runs_date').on(table.runAt),
    statusIdx: (0, sqlite_core_1.index)('idx_runs_status').on(table.status)
}));
// Email send logs
exports.emailLogs = (0, sqlite_core_1.sqliteTable)('email_logs', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    digestRunId: (0, sqlite_core_1.text)('digest_run_id').notNull().references(() => exports.digestRuns.id, { onDelete: 'cascade' }),
    // Email details
    recipient: (0, sqlite_core_1.text)('recipient').notNull(),
    subject: (0, sqlite_core_1.text)('subject').notNull(),
    // Resend integration
    resendId: (0, sqlite_core_1.text)('resend_id').unique(),
    resendStatus: (0, sqlite_core_1.text)('resend_status'), // Resend's status
    // Status tracking
    status: (0, sqlite_core_1.text)('status').notNull().default('pending'), // 'pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed'
    // Timestamps for events
    sentAt: (0, sqlite_core_1.integer)('sent_at', { mode: 'timestamp' }),
    deliveredAt: (0, sqlite_core_1.integer)('delivered_at', { mode: 'timestamp' }),
    openedAt: (0, sqlite_core_1.integer)('opened_at', { mode: 'timestamp' }),
    firstOpenedAt: (0, sqlite_core_1.integer)('first_opened_at', { mode: 'timestamp' }),
    clickedAt: (0, sqlite_core_1.integer)('clicked_at', { mode: 'timestamp' }),
    bouncedAt: (0, sqlite_core_1.integer)('bounced_at', { mode: 'timestamp' }),
    // Error tracking
    error: (0, sqlite_core_1.text)('error'),
    // Metrics
    openCount: (0, sqlite_core_1.integer)('open_count').default(0),
    clickCount: (0, sqlite_core_1.integer)('click_count').default(0),
    createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'timestamp' }).notNull().default((0, drizzle_orm_1.sql) `(unixepoch())`)
}, (table) => ({
    runIdx: (0, sqlite_core_1.index)('idx_emails_run').on(table.digestRunId),
    recipientIdx: (0, sqlite_core_1.index)('idx_emails_recipient').on(table.recipient),
    resendIdx: (0, sqlite_core_1.index)('idx_emails_resend').on(table.resendId),
    statusIdx: (0, sqlite_core_1.index)('idx_emails_status').on(table.status)
}));
// API Keys for external access
exports.apiKeys = (0, sqlite_core_1.sqliteTable)('api_keys', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    // Key details
    name: (0, sqlite_core_1.text)('name').notNull(),
    keyHash: (0, sqlite_core_1.text)('key_hash').notNull().unique(), // SHA256 hash of the key
    keyPrefix: (0, sqlite_core_1.text)('key_prefix').notNull(), // First 8 chars for identification
    // Ownership and permissions
    userId: (0, sqlite_core_1.text)('user_id').notNull(),
    accountId: (0, sqlite_core_1.text)('account_id').notNull(),
    role: (0, sqlite_core_1.text)('role').notNull(), // 'superadmin', 'admin', 'viewer'
    // Rate limiting
    rateLimit: (0, sqlite_core_1.integer)('rate_limit').notNull().default(60), // requests per minute
    // Usage tracking
    lastUsedAt: (0, sqlite_core_1.integer)('last_used_at', { mode: 'timestamp' }),
    lastUsedIp: (0, sqlite_core_1.text)('last_used_ip'),
    useCount: (0, sqlite_core_1.integer)('use_count').default(0),
    // Lifecycle
    expiresAt: (0, sqlite_core_1.integer)('expires_at', { mode: 'timestamp' }),
    revokedAt: (0, sqlite_core_1.integer)('revoked_at', { mode: 'timestamp' }),
    revokedBy: (0, sqlite_core_1.text)('revoked_by'),
    revokeReason: (0, sqlite_core_1.text)('revoke_reason'),
    createdAt: (0, sqlite_core_1.integer)('created_at', { mode: 'timestamp' }).notNull().default((0, drizzle_orm_1.sql) `(unixepoch())`),
    createdBy: (0, sqlite_core_1.text)('created_by').notNull()
}, (table) => ({
    userIdx: (0, sqlite_core_1.index)('idx_keys_user').on(table.userId),
    accountIdx: (0, sqlite_core_1.index)('idx_keys_account').on(table.accountId),
    prefixIdx: (0, sqlite_core_1.index)('idx_keys_prefix').on(table.keyPrefix)
}));
// Webhook events from Resend
exports.webhookEvents = (0, sqlite_core_1.sqliteTable)('webhook_events', {
    id: (0, sqlite_core_1.text)('id').primaryKey(),
    // Event details
    eventType: (0, sqlite_core_1.text)('event_type').notNull(), // 'email.sent', 'email.delivered', 'email.opened', etc.
    eventId: (0, sqlite_core_1.text)('event_id').notNull().unique(), // Resend's event ID
    // Email reference
    emailLogId: (0, sqlite_core_1.text)('email_log_id').references(() => exports.emailLogs.id),
    resendId: (0, sqlite_core_1.text)('resend_id'),
    // Event data
    payload: (0, sqlite_core_1.text)('payload').notNull(), // Full JSON payload
    // Processing
    processed: (0, sqlite_core_1.integer)('processed', { mode: 'boolean' }).default(false).notNull(),
    processedAt: (0, sqlite_core_1.integer)('processed_at', { mode: 'timestamp' }),
    error: (0, sqlite_core_1.text)('error'),
    receivedAt: (0, sqlite_core_1.integer)('received_at', { mode: 'timestamp' }).notNull().default((0, drizzle_orm_1.sql) `(unixepoch())`)
}, (table) => ({
    emailLogIdx: (0, sqlite_core_1.index)('idx_webhook_email').on(table.emailLogId),
    eventTypeIdx: (0, sqlite_core_1.index)('idx_webhook_type').on(table.eventType),
    processedIdx: (0, sqlite_core_1.index)('idx_webhook_processed').on(table.processed)
}));
//# sourceMappingURL=digests.js.map