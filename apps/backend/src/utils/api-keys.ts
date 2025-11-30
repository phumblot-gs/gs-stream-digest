import crypto from 'crypto';
import { getDb } from '@gs-digest/database';
import * as schema from '@gs-digest/database';

/**
 * Generate a secure API key
 *
 * Format: gs_live_<32 random chars> or gs_test_<32 random chars>
 *
 * @param environment - 'live' or 'test'
 * @returns The generated API key (only shown once!)
 */
export function generateApiKey(environment: 'live' | 'test' = 'live'): string {
  const randomBytes = crypto.randomBytes(24); // 24 bytes = 32 chars in base64
  const randomString = randomBytes.toString('base64url'); // URL-safe base64
  return `gs_${environment}_${randomString}`;
}

/**
 * Hash an API key using SHA-256
 */
export function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Extract the key prefix for display purposes
 *
 * @param apiKey - The full API key
 * @returns First 12 characters (e.g., "gs_live_abcd...")
 */
export function getKeyPrefix(apiKey: string): string {
  return apiKey.substring(0, 12) + '...';
}

/**
 * Create a new API key in the database
 *
 * @param name - Friendly name for the key
 * @param accountId - Optional account ID to scope the key
 * @param permissions - Array of permissions (e.g., ['read', 'write'])
 * @param createdBy - User ID who created the key
 * @param expiresAt - Optional expiration date
 * @returns Object with the generated key and key ID
 */
export async function createApiKey(params: {
  name: string;
  accountId?: string | null;
  permissions?: string[];
  createdBy?: string;
  expiresAt?: Date;
}): Promise<{ apiKey: string; keyId: string }> {
  const db = getDb();

  // Generate the API key
  const apiKey = generateApiKey('live');
  const keyHash = hashApiKey(apiKey);
  const keyPrefix = getKeyPrefix(apiKey);

  // Insert into database
  const [result] = await db
    .insert(schema.apiKeys)
    .values({
      name: params.name,
      keyPrefix,
      keyHash,
      accountId: params.accountId || null,
      permissions: JSON.stringify(params.permissions || ['read']),
      createdBy: params.createdBy,
      expiresAt: params.expiresAt,
      isActive: true,
    })
    .returning({ id: schema.apiKeys.id });

  return {
    apiKey, // Return the plain key (only time it's shown!)
    keyId: result.id,
  };
}

/**
 * Revoke an API key
 *
 * @param keyId - ID of the key to revoke
 * @param revokedBy - User ID who revoked the key
 */
export async function revokeApiKey(keyId: string, revokedBy?: string): Promise<void> {
  const db = getDb();

  await db
    .update(schema.apiKeys)
    .set({
      isActive: false,
      revokedAt: new Date(),
      revokedBy,
    })
    .where(schema.eq(schema.apiKeys.id, keyId));
}
