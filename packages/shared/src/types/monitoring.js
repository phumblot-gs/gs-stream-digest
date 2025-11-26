"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailTrackingEventSchema = exports.ExportRequestSchema = exports.MonitoringFiltersSchema = exports.GlobalStatsSchema = exports.DigestStatsSchema = void 0;
const zod_1 = require("zod");
// Monitoring stats
exports.DigestStatsSchema = zod_1.z.object({
    digestId: zod_1.z.string(),
    digestName: zod_1.z.string(),
    accountId: zod_1.z.string(),
    // Run stats
    totalRuns: zod_1.z.number(),
    successfulRuns: zod_1.z.number(),
    failedRuns: zod_1.z.number(),
    lastRunAt: zod_1.z.date().optional(),
    // Email stats
    totalEmailsSent: zod_1.z.number(),
    totalEmailsDelivered: zod_1.z.number(),
    totalEmailsOpened: zod_1.z.number(),
    totalEmailsClicked: zod_1.z.number(),
    totalEmailsBounced: zod_1.z.number(),
    // Rates
    deliveryRate: zod_1.z.number(), // 0-1
    openRate: zod_1.z.number(), // 0-1
    clickRate: zod_1.z.number(), // 0-1
    bounceRate: zod_1.z.number(), // 0-1
    // Event stats
    totalEventsProcessed: zod_1.z.number(),
    averageEventsPerRun: zod_1.z.number()
});
// Global monitoring stats (superadmin only)
exports.GlobalStatsSchema = zod_1.z.object({
    // Totals
    totalDigests: zod_1.z.number(),
    activeDigests: zod_1.z.number(),
    totalAccounts: zod_1.z.number(),
    // Run stats
    totalRuns: zod_1.z.number(),
    runsLast24Hours: zod_1.z.number(),
    runsLast7Days: zod_1.z.number(),
    runsLast30Days: zod_1.z.number(),
    // Email stats
    totalEmailsSent: zod_1.z.number(),
    emailsSentLast24Hours: zod_1.z.number(),
    emailsSentLast7Days: zod_1.z.number(),
    emailsSentLast30Days: zod_1.z.number(),
    // Performance
    averageRunDurationMs: zod_1.z.number(),
    averageEventsPerRun: zod_1.z.number(),
    // Health
    failureRateLast24Hours: zod_1.z.number(),
    currentQueueSize: zod_1.z.number(),
    // Top performers
    topDigestsByVolume: zod_1.z.array(exports.DigestStatsSchema),
    topDigestsByOpenRate: zod_1.z.array(exports.DigestStatsSchema),
    // By account breakdown
    statsByAccount: zod_1.z.array(zod_1.z.object({
        accountId: zod_1.z.string(),
        digestCount: zod_1.z.number(),
        emailsSent: zod_1.z.number(),
        openRate: zod_1.z.number()
    }))
});
// Monitoring filters
exports.MonitoringFiltersSchema = zod_1.z.object({
    accountIds: zod_1.z.array(zod_1.z.string()).optional(),
    digestIds: zod_1.z.array(zod_1.z.string()).optional(),
    eventTypes: zod_1.z.array(zod_1.z.string()).optional(),
    dateFrom: zod_1.z.date().optional(),
    dateTo: zod_1.z.date().optional(),
    status: zod_1.z.array(zod_1.z.enum(['success', 'failed', 'partial'])).optional()
});
// Export request
exports.ExportRequestSchema = zod_1.z.object({
    format: zod_1.z.enum(['xlsx', 'csv', 'json']),
    filters: exports.MonitoringFiltersSchema,
    includeDetails: zod_1.z.boolean().default(false)
});
// Email tracking event (from Resend webhook)
exports.EmailTrackingEventSchema = zod_1.z.object({
    type: zod_1.z.enum([
        'email.sent',
        'email.delivered',
        'email.delivery_delayed',
        'email.complained',
        'email.bounced',
        'email.opened',
        'email.clicked'
    ]),
    created_at: zod_1.z.string(),
    data: zod_1.z.object({
        email_id: zod_1.z.string(),
        from: zod_1.z.string().optional(),
        to: zod_1.z.array(zod_1.z.string()),
        subject: zod_1.z.string().optional(),
        click: zod_1.z.object({
            ipAddress: zod_1.z.string(),
            link: zod_1.z.string(),
            timestamp: zod_1.z.string(),
            userAgent: zod_1.z.string()
        }).optional(),
        bounce: zod_1.z.object({
            message: zod_1.z.string()
        }).optional()
    })
});
//# sourceMappingURL=monitoring.js.map