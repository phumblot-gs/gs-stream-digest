"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduleConfigSchema = exports.ScheduleTypeSchema = exports.EventFiltersSchema = exports.FileShareEventSchema = exports.EventSchema = void 0;
const zod_1 = require("zod");
// Event types from gs-stream-events
exports.EventSchema = zod_1.z.object({
    uid: zod_1.z.string(),
    timestamp: zod_1.z.string(),
    eventType: zod_1.z.string(),
    accountId: zod_1.z.string(),
    userId: zod_1.z.string().optional(),
    source: zod_1.z.object({
        application: zod_1.z.string(),
        environment: zod_1.z.string(),
        version: zod_1.z.string().optional()
    }),
    data: zod_1.z.record(zod_1.z.any()),
    metadata: zod_1.z.record(zod_1.z.any()).optional()
});
// File share event specific schema
exports.FileShareEventSchema = exports.EventSchema.extend({
    eventType: zod_1.z.literal('file.share'),
    data: zod_1.z.object({
        file: zod_1.z.object({
            id: zod_1.z.string(),
            name: zod_1.z.string(),
            size: zod_1.z.number().optional(),
            path: zod_1.z.string().optional(),
            mimeType: zod_1.z.string().optional()
        }),
        sharedBy: zod_1.z.object({
            id: zod_1.z.string(),
            name: zod_1.z.string(),
            email: zod_1.z.string().optional()
        }),
        sharedWith: zod_1.z.array(zod_1.z.object({
            id: zod_1.z.string(),
            name: zod_1.z.string(),
            email: zod_1.z.string(),
            type: zod_1.z.enum(['user', 'group', 'external'])
        })),
        permissions: zod_1.z.array(zod_1.z.enum(['view', 'edit', 'download', 'share'])).optional(),
        message: zod_1.z.string().optional(),
        expiresAt: zod_1.z.string().optional()
    })
});
// Filter criteria for selecting events
exports.EventFiltersSchema = zod_1.z.object({
    // Account filter (handled by permission system)
    accountIds: zod_1.z.array(zod_1.z.string()).optional(),
    // Event type filters
    eventTypes: zod_1.z.array(zod_1.z.string()).optional(),
    // Source filters
    sourceApplications: zod_1.z.array(zod_1.z.string()).optional(),
    sourceEnvironments: zod_1.z.array(zod_1.z.string()).optional(),
    // User filters
    userIds: zod_1.z.array(zod_1.z.string()).optional(),
    // Data field filters (JSONPath queries)
    dataFilters: zod_1.z.array(zod_1.z.object({
        path: zod_1.z.string(), // e.g., "$.file.mimeType"
        operator: zod_1.z.enum(['equals', 'not_equals', 'contains', 'not_contains', 'exists', 'not_exists']),
        value: zod_1.z.any().optional()
    })).optional(),
    // Time window (in addition to since last check)
    maxAgeHours: zod_1.z.number().optional() // Only include events from last N hours
});
// Schedule types
exports.ScheduleTypeSchema = zod_1.z.enum([
    'hourly', // Every hour
    'every_6_hours', // Every 6 hours
    'daily', // Once a day at specific time
    'weekly', // Specific days of week
    'monthly', // Specific day of month
    'custom' // Custom cron expression
]);
exports.ScheduleConfigSchema = zod_1.z.object({
    type: exports.ScheduleTypeSchema,
    // For daily schedule
    dailyTime: zod_1.z.string().optional(), // e.g., "09:00"
    // For weekly schedule
    weekDays: zod_1.z.array(zod_1.z.number().min(0).max(6)).optional(), // 0 = Sunday
    weeklyTime: zod_1.z.string().optional(), // e.g., "09:00"
    // For monthly schedule
    monthDay: zod_1.z.number().min(1).max(31).optional(),
    monthlyTime: zod_1.z.string().optional(),
    // For custom cron
    cronExpression: zod_1.z.string().optional(),
    // Timezone
    timezone: zod_1.z.string().default('Europe/Paris')
});
//# sourceMappingURL=events.js.map