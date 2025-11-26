"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthContextSchema = exports.APIKeyResponseSchema = exports.CreateAPIKeySchema = exports.APIKeySchema = exports.JWTPayloadSchema = exports.UserSchema = exports.UserRoleSchema = void 0;
exports.canAccessAccount = canAccessAccount;
exports.canModifyResource = canModifyResource;
exports.canAccessMonitoring = canAccessMonitoring;
exports.filterByAccountAccess = filterByAccountAccess;
const zod_1 = require("zod");
// User roles
exports.UserRoleSchema = zod_1.z.enum(['superadmin', 'admin', 'viewer']);
// User from Supabase auth
exports.UserSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    email: zod_1.z.string().email(),
    role: exports.UserRoleSchema,
    accountId: zod_1.z.string(),
    accountIds: zod_1.z.array(zod_1.z.string()).optional(), // For superadmin with multi-account access
    metadata: zod_1.z.record(zod_1.z.any()).optional()
});
// JWT payload
exports.JWTPayloadSchema = zod_1.z.object({
    sub: zod_1.z.string(), // user id
    email: zod_1.z.string().email(),
    role: exports.UserRoleSchema,
    accountId: zod_1.z.string(),
    accountIds: zod_1.z.array(zod_1.z.string()).optional(),
    iat: zod_1.z.number(),
    exp: zod_1.z.number()
});
// API Key
exports.APIKeySchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string().min(1).max(255),
    keyPrefix: zod_1.z.string(), // First 8 chars for identification
    // Permissions
    userId: zod_1.z.string(),
    accountId: zod_1.z.string(),
    role: exports.UserRoleSchema,
    // Rate limiting
    rateLimit: zod_1.z.number().default(60),
    // Usage
    lastUsedAt: zod_1.z.date().optional(),
    lastUsedIp: zod_1.z.string().optional(),
    useCount: zod_1.z.number().default(0),
    // Lifecycle
    expiresAt: zod_1.z.date().optional(),
    revokedAt: zod_1.z.date().optional(),
    revokedBy: zod_1.z.string().optional(),
    revokeReason: zod_1.z.string().optional(),
    createdAt: zod_1.z.date(),
    createdBy: zod_1.z.string()
});
// Create API Key request
exports.CreateAPIKeySchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255),
    expiresIn: zod_1.z.number().optional() // Seconds until expiration
});
// API Key response (includes the actual key only on creation)
exports.APIKeyResponseSchema = exports.APIKeySchema.extend({
    key: zod_1.z.string().optional() // Only provided on creation
});
// Auth context for requests
exports.AuthContextSchema = zod_1.z.object({
    user: exports.UserSchema,
    isAPIKey: zod_1.z.boolean().default(false),
    apiKeyId: zod_1.z.string().optional()
});
// Permission check helpers
function canAccessAccount(user, accountId) {
    if (user.role === 'superadmin') {
        // Superadmin can access all accounts
        return true;
    }
    // Admin and viewer can only access their own account
    return user.accountId === accountId;
}
function canModifyResource(user, resourceAccountId) {
    if (!canAccessAccount(user, resourceAccountId)) {
        return false;
    }
    // Viewers cannot modify resources
    if (user.role === 'viewer') {
        return false;
    }
    return true;
}
function canAccessMonitoring(user) {
    return user.role === 'superadmin';
}
function filterByAccountAccess(user, items) {
    if (user.role === 'superadmin') {
        return items;
    }
    return items.filter(item => item.accountId === user.accountId);
}
//# sourceMappingURL=auth.js.map