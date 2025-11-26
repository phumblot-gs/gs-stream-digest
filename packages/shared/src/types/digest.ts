import { z } from 'zod';
import { EventFiltersSchema, ScheduleConfigSchema } from './events';

// Digest configuration
export const DigestConfigSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  accountId: z.string(),

  // Filtering
  filters: EventFiltersSchema,

  // Scheduling
  schedule: ScheduleConfigSchema,

  // Recipients
  recipients: z.array(z.string().email()),
  testRecipients: z.array(z.string().email()).optional(),

  // Template
  templateId: z.string(),

  // Status
  isActive: z.boolean().default(true),
  isPaused: z.boolean().default(false),

  // Metadata
  createdBy: z.string(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type DigestConfig = z.infer<typeof DigestConfigSchema>;

// Create/Update DTOs
export const CreateDigestSchema = DigestConfigSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true
});

export type CreateDigest = z.infer<typeof CreateDigestSchema>;

export const UpdateDigestSchema = CreateDigestSchema.partial();

export type UpdateDigest = z.infer<typeof UpdateDigestSchema>;

// Digest run results
export const DigestRunSchema = z.object({
  id: z.string(),
  digestId: z.string(),
  runAt: z.date(),
  runType: z.enum(['scheduled', 'manual', 'test']),

  // Events
  eventsCount: z.number(),
  events: z.array(z.any()), // Event[]

  // Email stats
  emailsSent: z.number(),
  emailsFailed: z.number(),

  // Status
  status: z.enum(['pending', 'processing', 'success', 'failed', 'partial']),
  error: z.string().optional(),

  // Performance
  durationMs: z.number().optional(),

  // Manual trigger info
  triggeredBy: z.string().optional(),

  completedAt: z.date().optional()
});

export type DigestRun = z.infer<typeof DigestRunSchema>;

// Template configuration
export const DigestTemplateSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),

  // Ownership
  accountId: z.string().nullable(),
  isGlobal: z.boolean().default(false),
  isDefault: z.boolean().default(false),

  // Templates
  subjectLiquid: z.string().min(1),
  bodyHtmlLiquid: z.string().min(1),
  bodyTextLiquid: z.string().optional(),

  // Preview
  previewData: z.any().optional(), // Sample events for preview

  // Metadata
  createdBy: z.string(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type DigestTemplate = z.infer<typeof DigestTemplateSchema>;

// Create/Update Template DTOs
export const CreateTemplateSchema = DigestTemplateSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true
});

export type CreateTemplate = z.infer<typeof CreateTemplateSchema>;

export const UpdateTemplateSchema = CreateTemplateSchema.partial();

export type UpdateTemplate = z.infer<typeof UpdateTemplateSchema>;

// Test/Preview requests
export const TestDigestRequestSchema = z.object({
  digestId: z.string(),
  recipientEmail: z.string().email(),
  limit: z.number().min(1).max(100).default(10)
});

export type TestDigestRequest = z.infer<typeof TestDigestRequestSchema>;

export const PreviewTemplateRequestSchema = z.object({
  templateId: z.string().optional(),
  template: z.object({
    subjectLiquid: z.string(),
    bodyHtmlLiquid: z.string(),
    bodyTextLiquid: z.string().optional()
  }).optional(),
  events: z.array(z.any()).optional(), // Use sample events
  useRealEvents: z.boolean().default(false),
  filters: EventFiltersSchema.optional()
});

export type PreviewTemplateRequest = z.infer<typeof PreviewTemplateRequestSchema>;