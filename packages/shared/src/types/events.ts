import { z } from 'zod';

// Event types from gs-stream-events
export const EventSchema = z.object({
  uid: z.string(),
  timestamp: z.string(),
  eventType: z.string(),
  accountId: z.string(),
  userId: z.string().optional(),
  source: z.object({
    application: z.string(),
    environment: z.string(),
    version: z.string().optional()
  }),
  data: z.record(z.any()),
  metadata: z.record(z.any()).optional()
});

export type Event = z.infer<typeof EventSchema>;

// File share event specific schema
export const FileShareEventSchema = EventSchema.extend({
  eventType: z.literal('file.share'),
  data: z.object({
    file: z.object({
      id: z.string(),
      name: z.string(),
      size: z.number().optional(),
      path: z.string().optional(),
      mimeType: z.string().optional()
    }),
    sharedBy: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string().optional()
    }),
    sharedWith: z.array(z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      type: z.enum(['user', 'group', 'external'])
    })),
    permissions: z.array(z.enum(['view', 'edit', 'download', 'share'])).optional(),
    message: z.string().optional(),
    expiresAt: z.string().optional()
  })
});

export type FileShareEvent = z.infer<typeof FileShareEventSchema>;

// Filter criteria for selecting events
export const EventFiltersSchema = z.object({
  // Account filter (handled by permission system)
  accountIds: z.array(z.string()).optional(),

  // Event type filters
  eventTypes: z.array(z.string()).optional(),

  // Source filters
  sourceApplications: z.array(z.string()).optional(),
  sourceEnvironments: z.array(z.string()).optional(),

  // User filters
  userIds: z.array(z.string()).optional(),

  // Data field filters (JSONPath queries)
  dataFilters: z.array(z.object({
    path: z.string(), // e.g., "$.file.mimeType"
    operator: z.enum(['equals', 'not_equals', 'contains', 'not_contains', 'exists', 'not_exists']),
    value: z.any().optional()
  })).optional(),

  // Time window (in addition to since last check)
  maxAgeHours: z.number().optional() // Only include events from last N hours
});

export type EventFilters = z.infer<typeof EventFiltersSchema>;

// Schedule types
export const ScheduleTypeSchema = z.enum([
  'hourly',           // Every hour
  'every_6_hours',    // Every 6 hours
  'daily',            // Once a day at specific time
  'weekly',           // Specific days of week
  'monthly',          // Specific day of month
  'custom'            // Custom cron expression
]);

export type ScheduleType = z.infer<typeof ScheduleTypeSchema>;

export const ScheduleConfigSchema = z.object({
  type: ScheduleTypeSchema,

  // For daily schedule
  dailyTime: z.string().optional(), // e.g., "09:00"

  // For weekly schedule
  weekDays: z.array(z.number().min(0).max(6)).optional(), // 0 = Sunday
  weeklyTime: z.string().optional(), // e.g., "09:00"

  // For monthly schedule
  monthDay: z.number().min(1).max(31).optional(),
  monthlyTime: z.string().optional(),

  // For custom cron
  cronExpression: z.string().optional(),

  // Timezone
  timezone: z.string().default('Europe/Paris')
});

export type ScheduleConfig = z.infer<typeof ScheduleConfigSchema>;