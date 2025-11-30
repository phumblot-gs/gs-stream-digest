import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { getDb } from '@gs-digest/database';
import * as schema from '@gs-digest/database';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

declare module 'fastify' {
  interface FastifyRequest {
    apiKey?: {
      id: string;
      accountId: string | null;
      permissions: string[];
    };
  }
}

/**
 * Hash an API key using SHA-256
 */
function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Verify and authenticate an API key
 *
 * Looks for API key in:
 * 1. X-API-Key header
 * 2. Authorization: Bearer <key> header
 */
async function verifyApiKey(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const db = getDb();

  // Extract API key from headers
  const apiKeyHeader = request.headers['x-api-key'] as string | undefined;
  const authHeader = request.headers.authorization as string | undefined;

  let apiKeyValue: string | undefined;

  if (apiKeyHeader) {
    apiKeyValue = apiKeyHeader;
  } else if (authHeader && authHeader.startsWith('Bearer ')) {
    apiKeyValue = authHeader.substring(7);
  }

  if (!apiKeyValue) {
    return reply.code(401).send({
      error: 'Unauthorized',
      message: 'API key required. Provide via X-API-Key header or Authorization: Bearer header',
    });
  }

  // Hash the provided key
  const keyHash = hashApiKey(apiKeyValue);

  // Look up the key in the database
  const [apiKey] = await db
    .select()
    .from(schema.apiKeys)
    .where(eq(schema.apiKeys.keyHash, keyHash))
    .limit(1);

  if (!apiKey) {
    return reply.code(401).send({
      error: 'Unauthorized',
      message: 'Invalid API key',
    });
  }

  // Check if key is active
  if (!apiKey.isActive) {
    return reply.code(401).send({
      error: 'Unauthorized',
      message: 'API key has been revoked',
    });
  }

  // Check if key is expired
  if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
    return reply.code(401).send({
      error: 'Unauthorized',
      message: 'API key has expired',
    });
  }

  // Parse permissions
  const permissions = JSON.parse(apiKey.permissions || '["read"]');

  // Attach API key info to request
  request.apiKey = {
    id: apiKey.id,
    accountId: apiKey.accountId,
    permissions,
  };

  // Update last used timestamp (async, don't await)
  db.update(schema.apiKeys)
    .set({ lastUsedAt: new Date() })
    .where(eq(schema.apiKeys.id, apiKey.id))
    .then(() => {})
    .catch((err) => {
      request.log.error('Failed to update API key last used timestamp:', err);
    });
}

const apiKeyAuthPlugin: FastifyPluginAsync = async (fastify) => {
  // Register the verifyApiKey function as a decorator
  fastify.decorate('verifyApiKey', verifyApiKey);
};

export default fp(apiKeyAuthPlugin);

// Export for use as a preHandler hook
export { verifyApiKey };
