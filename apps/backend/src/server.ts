import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';

import authPlugin from './plugins/auth';
import errorHandler from './plugins/error-handler';

// Import routes
import digestRoutes from './api/digests/simple-routes'; // Using simplified routes without auth for now
import templateRoutes from './api/templates/routes';
import emailRoutes from './api/emails/routes';
import authRoutes from './api/auth/routes';
import monitoringRoutes from './api/monitoring/routes';
import webhookRoutes from './api/webhooks/routes';
import adminRoutes from './api/admin/routes';

export async function createServer() {
  const server = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport:
        process.env.NODE_ENV === 'development'
          ? {
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
    },
  }).withTypeProvider<TypeBoxTypeProvider>();

  // Register CORS
  await server.register(cors, {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  });

  // Register JWT
  await server.register(jwt, {
    secret: process.env.JWT_SECRET || 'your-secret-key-here',
    sign: {
      expiresIn: '7d',
    },
  });

  // Register rate limiting
  await server.register(rateLimit, {
    global: false, // We'll apply rate limiting per route
    max: 100,
    timeWindow: '1 minute',
  });

  // Register Swagger
  await server.register(swagger, {
    swagger: {
      info: {
        title: 'GS Stream Digest API',
        description: 'API for managing email digests of Grand Shooting stream events',
        version: '0.1.0',
      },
      host: process.env.API_HOST || 'localhost:3000',
      schemes: ['http', 'https'],
      consumes: ['application/json'],
      produces: ['application/json'],
      tags: [
        { name: 'auth', description: 'Authentication endpoints' },
        { name: 'digests', description: 'Digest management' },
        { name: 'templates', description: 'Email template management' },
        { name: 'emails', description: 'Email history and tracking' },
        { name: 'monitoring', description: 'Monitoring and statistics' },
        { name: 'webhooks', description: 'Webhook endpoints' },
        { name: 'admin', description: 'Admin configuration endpoints' },
      ],
      securityDefinitions: {
        Bearer: {
          type: 'apiKey',
          name: 'Authorization',
          in: 'header',
          description: 'JWT Bearer token',
        },
        ApiKey: {
          type: 'apiKey',
          name: 'X-API-Key',
          in: 'header',
          description: 'API Key authentication',
        },
      },
    },
  });

  await server.register(swaggerUi, {
    routePrefix: '/documentation',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
    staticCSP: true,
  });

  // Register custom plugins
  await server.register(authPlugin);
  await server.register(errorHandler);

  // Health check
  server.get('/health', async (request, reply) => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    };
  });

  // Register API routes
  await server.register(authRoutes, { prefix: '/api/auth' });
  await server.register(digestRoutes, { prefix: '/api/digests' });
  await server.register(templateRoutes, { prefix: '/api/templates' });
  await server.register(emailRoutes, { prefix: '/api/emails' });
  await server.register(monitoringRoutes, { prefix: '/api/monitoring' });
  await server.register(webhookRoutes, { prefix: '/api/webhooks' });
  await server.register(adminRoutes, { prefix: '/api/admin' });

  return server;
}