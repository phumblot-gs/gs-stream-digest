import { z } from 'zod';

// Monitoring stats
export const DigestStatsSchema = z.object({
  digestId: z.string(),
  digestName: z.string(),
  accountId: z.string(),

  // Run stats
  totalRuns: z.number(),
  successfulRuns: z.number(),
  failedRuns: z.number(),
  lastRunAt: z.date().optional(),

  // Email stats
  totalEmailsSent: z.number(),
  totalEmailsDelivered: z.number(),
  totalEmailsOpened: z.number(),
  totalEmailsClicked: z.number(),
  totalEmailsBounced: z.number(),

  // Rates
  deliveryRate: z.number(), // 0-1
  openRate: z.number(), // 0-1
  clickRate: z.number(), // 0-1
  bounceRate: z.number(), // 0-1

  // Event stats
  totalEventsProcessed: z.number(),
  averageEventsPerRun: z.number()
});

export type DigestStats = z.infer<typeof DigestStatsSchema>;

// Global monitoring stats (superadmin only)
export const GlobalStatsSchema = z.object({
  // Totals
  totalDigests: z.number(),
  activeDigests: z.number(),
  totalAccounts: z.number(),

  // Run stats
  totalRuns: z.number(),
  runsLast24Hours: z.number(),
  runsLast7Days: z.number(),
  runsLast30Days: z.number(),

  // Email stats
  totalEmailsSent: z.number(),
  emailsSentLast24Hours: z.number(),
  emailsSentLast7Days: z.number(),
  emailsSentLast30Days: z.number(),

  // Performance
  averageRunDurationMs: z.number(),
  averageEventsPerRun: z.number(),

  // Health
  failureRateLast24Hours: z.number(),
  currentQueueSize: z.number(),

  // Top performers
  topDigestsByVolume: z.array(DigestStatsSchema),
  topDigestsByOpenRate: z.array(DigestStatsSchema),

  // By account breakdown
  statsByAccount: z.array(z.object({
    accountId: z.string(),
    digestCount: z.number(),
    emailsSent: z.number(),
    openRate: z.number()
  }))
});

export type GlobalStats = z.infer<typeof GlobalStatsSchema>;

// Monitoring filters
export const MonitoringFiltersSchema = z.object({
  accountIds: z.array(z.string()).optional(),
  digestIds: z.array(z.string()).optional(),
  eventTypes: z.array(z.string()).optional(),
  dateFrom: z.date().optional(),
  dateTo: z.date().optional(),
  status: z.array(z.enum(['success', 'failed', 'partial'])).optional()
});

export type MonitoringFilters = z.infer<typeof MonitoringFiltersSchema>;

// Export request
export const ExportRequestSchema = z.object({
  format: z.enum(['xlsx', 'csv', 'json']),
  filters: MonitoringFiltersSchema,
  includeDetails: z.boolean().default(false)
});

export type ExportRequest = z.infer<typeof ExportRequestSchema>;

// Email tracking event (from Resend webhook)
export const EmailTrackingEventSchema = z.object({
  type: z.enum([
    'email.sent',
    'email.delivered',
    'email.delivery_delayed',
    'email.complained',
    'email.bounced',
    'email.opened',
    'email.clicked'
  ]),
  created_at: z.string(),
  data: z.object({
    email_id: z.string(),
    from: z.string().optional(),
    to: z.array(z.string()),
    subject: z.string().optional(),
    click: z.object({
      ipAddress: z.string(),
      link: z.string(),
      timestamp: z.string(),
      userAgent: z.string()
    }).optional(),
    bounce: z.object({
      message: z.string()
    }).optional()
  })
});

export type EmailTrackingEvent = z.infer<typeof EmailTrackingEventSchema>;