import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import { getDb, schema } from '@gs-digest/database';
import { eq } from 'drizzle-orm';
import type { User, UserRole } from '@gs-digest/shared';
import { logger } from '../utils/logger';

declare module 'fastify' {
  interface FastifyRequest {
    user?: User;
    supabase?: SupabaseClient;
  }
}

export interface AuthPluginOptions {
  requireAuth?: boolean;
  requireRole?: UserRole | UserRole[];
}

async function authPlugin(fastify: FastifyInstance) {
  const db = getDb();

  // Log Supabase configuration
  logger.info({
    event: 'supabase_init',
    phase: 'start',
    config: {
      SUPABASE_URL: process.env.SUPABASE_URL || '[NOT SET]',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '[SET]' : '[NOT SET]',
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? '[SET]' : '[NOT SET]',
    },
  }, 'Initializing Supabase client...');

  // Initialize Supabase client
  let supabase;
  try {
    if (!process.env.SUPABASE_URL) {
      throw new Error('SUPABASE_URL environment variable is not set');
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is not set');
    }

    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Test Supabase connection
    const { data: healthCheck, error: healthError } = await supabase.auth.getSession();
    
    logger.info({
      event: 'supabase_init',
      phase: 'success',
      healthCheck: {
        hasError: !!healthError,
        errorMessage: healthError?.message,
      },
    }, '✅ Supabase client initialized');
  } catch (error) {
    logger.error({
      event: 'supabase_init',
      phase: 'failed',
      error: error instanceof Error ? {
        message: error.message,
        name: error.name,
        stack: error.stack,
      } : String(error),
      config: {
        SUPABASE_URL: process.env.SUPABASE_URL || '[NOT SET]',
        SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? '[SET]' : '[NOT SET]',
      },
    }, '❌ Failed to initialize Supabase client');
    throw error;
  }

  // Decorate request with Supabase client (check if not already decorated)
  if (!fastify.hasRequestDecorator('supabase')) {
    fastify.decorateRequest('supabase', null);
  }
  if (!fastify.hasRequestDecorator('user')) {
    fastify.decorateRequest('user', null);
  }

  // Add auth hooks
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    request.supabase = supabase;

    const authHeader = request.headers.authorization;
    const apiKey = request.headers['x-api-key'] as string;

    // Check for API key authentication
    if (apiKey) {
      try {
        // Hash the API key to compare with stored hash
        const keyHash = await bcrypt.hash(apiKey, 10);

        // Find the API key in database
        const apiKeyRecord = await db
          .select()
          .from(schema.apiKeys)
          .where(eq(schema.apiKeys.keyPrefix, apiKey.substring(0, 8)))
          .limit(1);

        if (apiKeyRecord.length > 0 && !apiKeyRecord[0].revokedAt) {
          const validKey = await bcrypt.compare(apiKey, apiKeyRecord[0].keyHash);

          if (validKey) {
            // Update last used
            await db
              .update(schema.apiKeys)
              .set({
                lastUsedAt: new Date(),
                lastUsedIp: request.ip,
                useCount: (apiKeyRecord[0].useCount || 0) + 1
              })
              .where(eq(schema.apiKeys.id, apiKeyRecord[0].id));

            // Set user from API key
            request.user = {
              id: apiKeyRecord[0].userId,
              email: '', // API keys don't have email
              role: apiKeyRecord[0].role as UserRole,
              accountId: apiKeyRecord[0].accountId,
              accountIds: apiKeyRecord[0].role === 'superadmin' ? [] : undefined
            };

            return;
          }
        }
      } catch (error) {
        logger.error('API key validation error:', error);
      }
    }

    // Check for Bearer token (JWT)
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      try {
        // Verify JWT
        const decoded = await fastify.jwt.verify(token);

        // Get user from Supabase
        const { data: { user: supabaseUser }, error } = await supabase.auth.getUser(token);

        if (supabaseUser && !error) {
          // Get user profile from Supabase
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', supabaseUser.id)
            .single();

          if (profile) {
            request.user = {
              id: supabaseUser.id,
              email: supabaseUser.email!,
              role: profile.role || 'viewer',
              accountId: profile.account_id,
              accountIds: profile.role === 'superadmin' ? [] : undefined,
              metadata: profile
            };
          }
        }
      } catch (error) {
        logger.debug('JWT verification failed:', error);
      }
    }
  });
}

// Create auth preHandler
export function requireAuth(options: AuthPluginOptions = {}) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' });
    }

    // Check role requirements
    if (options.requireRole) {
      const requiredRoles = Array.isArray(options.requireRole)
        ? options.requireRole
        : [options.requireRole];

      if (!requiredRoles.includes(request.user.role)) {
        return reply.code(403).send({
          error: 'Insufficient permissions',
          required: requiredRoles,
          current: request.user.role
        });
      }
    }
  };
}

export default fp(authPlugin, {
  name: 'auth'
});