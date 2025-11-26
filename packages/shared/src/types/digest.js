"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreviewTemplateRequestSchema = exports.TestDigestRequestSchema = exports.UpdateTemplateSchema = exports.CreateTemplateSchema = exports.DigestTemplateSchema = exports.DigestRunSchema = exports.UpdateDigestSchema = exports.CreateDigestSchema = exports.DigestConfigSchema = void 0;
const zod_1 = require("zod");
const events_1 = require("./events");
// Digest configuration
exports.DigestConfigSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().optional(),
    accountId: zod_1.z.string(),
    // Filtering
    filters: events_1.EventFiltersSchema,
    // Scheduling
    schedule: events_1.ScheduleConfigSchema,
    // Recipients
    recipients: zod_1.z.array(zod_1.z.string().email()),
    testRecipients: zod_1.z.array(zod_1.z.string().email()).optional(),
    // Template
    templateId: zod_1.z.string(),
    // Status
    isActive: zod_1.z.boolean().default(true),
    isPaused: zod_1.z.boolean().default(false),
    // Metadata
    createdBy: zod_1.z.string(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date()
});
// Create/Update DTOs
exports.CreateDigestSchema = exports.DigestConfigSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    createdBy: true
});
exports.UpdateDigestSchema = exports.CreateDigestSchema.partial();
// Digest run results
exports.DigestRunSchema = zod_1.z.object({
    id: zod_1.z.string(),
    digestId: zod_1.z.string(),
    runAt: zod_1.z.date(),
    runType: zod_1.z.enum(['scheduled', 'manual', 'test']),
    // Events
    eventsCount: zod_1.z.number(),
    events: zod_1.z.array(zod_1.z.any()), // Event[]
    // Email stats
    emailsSent: zod_1.z.number(),
    emailsFailed: zod_1.z.number(),
    // Status
    status: zod_1.z.enum(['pending', 'processing', 'success', 'failed', 'partial']),
    error: zod_1.z.string().optional(),
    // Performance
    durationMs: zod_1.z.number().optional(),
    // Manual trigger info
    triggeredBy: zod_1.z.string().optional(),
    completedAt: zod_1.z.date().optional()
});
// Template configuration
exports.DigestTemplateSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().optional(),
    // Ownership
    accountId: zod_1.z.string().nullable(),
    isGlobal: zod_1.z.boolean().default(false),
    isDefault: zod_1.z.boolean().default(false),
    // Templates
    subjectLiquid: zod_1.z.string().min(1),
    bodyHtmlLiquid: zod_1.z.string().min(1),
    bodyTextLiquid: zod_1.z.string().optional(),
    // Preview
    previewData: zod_1.z.any().optional(), // Sample events for preview
    // Metadata
    createdBy: zod_1.z.string(),
    createdAt: zod_1.z.date(),
    updatedAt: zod_1.z.date()
});
// Create/Update Template DTOs
exports.CreateTemplateSchema = exports.DigestTemplateSchema.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
    createdBy: true
});
exports.UpdateTemplateSchema = exports.CreateTemplateSchema.partial();
// Test/Preview requests
exports.TestDigestRequestSchema = zod_1.z.object({
    digestId: zod_1.z.string(),
    recipientEmail: zod_1.z.string().email(),
    limit: zod_1.z.number().min(1).max(100).default(10)
});
exports.PreviewTemplateRequestSchema = zod_1.z.object({
    templateId: zod_1.z.string().optional(),
    template: zod_1.z.object({
        subjectLiquid: zod_1.z.string(),
        bodyHtmlLiquid: zod_1.z.string(),
        bodyTextLiquid: zod_1.z.string().optional()
    }).optional(),
    events: zod_1.z.array(zod_1.z.any()).optional(), // Use sample events
    useRealEvents: zod_1.z.boolean().default(false),
    filters: events_1.EventFiltersSchema.optional()
});
//# sourceMappingURL=digest.js.map