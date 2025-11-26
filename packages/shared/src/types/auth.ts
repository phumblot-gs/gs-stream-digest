import { z } from 'zod';

// User roles
export const UserRoleSchema = z.enum(['superadmin', 'admin', 'viewer']);
export type UserRole = z.infer<typeof UserRoleSchema>;

// User from Supabase auth
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: UserRoleSchema,
  accountId: z.string(),
  accountIds: z.array(z.string()).optional(), // For superadmin with multi-account access
  metadata: z.record(z.any()).optional()
});

export type User = z.infer<typeof UserSchema>;

// JWT payload
export const JWTPayloadSchema = z.object({
  sub: z.string(), // user id
  email: z.string().email(),
  role: UserRoleSchema,
  accountId: z.string(),
  accountIds: z.array(z.string()).optional(),
  iat: z.number(),
  exp: z.number()
});

export type JWTPayload = z.infer<typeof JWTPayloadSchema>;

// API Key
export const APIKeySchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(255),
  keyPrefix: z.string(), // First 8 chars for identification

  // Permissions
  userId: z.string(),
  accountId: z.string(),
  role: UserRoleSchema,

  // Rate limiting
  rateLimit: z.number().default(60),

  // Usage
  lastUsedAt: z.date().optional(),
  lastUsedIp: z.string().optional(),
  useCount: z.number().default(0),

  // Lifecycle
  expiresAt: z.date().optional(),
  revokedAt: z.date().optional(),
  revokedBy: z.string().optional(),
  revokeReason: z.string().optional(),

  createdAt: z.date(),
  createdBy: z.string()
});

export type APIKey = z.infer<typeof APIKeySchema>;

// Create API Key request
export const CreateAPIKeySchema = z.object({
  name: z.string().min(1).max(255),
  expiresIn: z.number().optional() // Seconds until expiration
});

export type CreateAPIKey = z.infer<typeof CreateAPIKeySchema>;

// API Key response (includes the actual key only on creation)
export const APIKeyResponseSchema = APIKeySchema.extend({
  key: z.string().optional() // Only provided on creation
});

export type APIKeyResponse = z.infer<typeof APIKeyResponseSchema>;

// Auth context for requests
export const AuthContextSchema = z.object({
  user: UserSchema,
  isAPIKey: z.boolean().default(false),
  apiKeyId: z.string().optional()
});

export type AuthContext = z.infer<typeof AuthContextSchema>;

// Permission check helpers
export function canAccessAccount(user: User, accountId: string): boolean {
  if (user.role === 'superadmin') {
    // Superadmin can access all accounts
    return true;
  }

  // Admin and viewer can only access their own account
  return user.accountId === accountId;
}

export function canModifyResource(user: User, resourceAccountId: string): boolean {
  if (!canAccessAccount(user, resourceAccountId)) {
    return false;
  }

  // Viewers cannot modify resources
  if (user.role === 'viewer') {
    return false;
  }

  return true;
}

export function canAccessMonitoring(user: User): boolean {
  return user.role === 'superadmin';
}

export function filterByAccountAccess<T extends { accountId: string }>(
  user: User,
  items: T[]
): T[] {
  if (user.role === 'superadmin') {
    return items;
  }

  return items.filter(item => item.accountId === user.accountId);
}