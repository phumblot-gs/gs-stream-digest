import { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';
import { ZodError } from 'zod';
import { Sentry } from '../utils/sentry';
import { logger } from '../utils/logger';

async function errorHandler(fastify: FastifyInstance) {
  fastify.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    // Log error
    logger.error({
      err: error,
      request: {
        method: request.method,
        url: request.url,
        params: request.params,
        query: request.query,
        headers: request.headers
      }
    }, 'Request error');

    // Send to Sentry
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(error, {
        contexts: {
          request: {
            method: request.method,
            url: request.url,
            params: request.params,
            query: request.query
          }
        },
        user: request.user ? {
          id: request.user.id,
          email: request.user.email
        } : undefined
      });
    }

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Validation Error',
        message: 'Invalid request data',
        details: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      });
    }

    // Handle Fastify validation errors
    if (error.validation) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Validation Error',
        message: error.message,
        details: error.validation
      });
    }

    // Handle authentication errors
    if (error.statusCode === 401) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    // Handle authorization errors
    if (error.statusCode === 403) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Insufficient permissions'
      });
    }

    // Handle not found errors
    if (error.statusCode === 404) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: error.message || 'Resource not found'
      });
    }

    // Handle rate limit errors
    if (error.statusCode === 429) {
      return reply.status(429).send({
        statusCode: 429,
        error: 'Too Many Requests',
        message: 'Rate limit exceeded'
      });
    }

    // Default error response
    const statusCode = error.statusCode || 500;
    const message = statusCode < 500 ? error.message : 'Internal server error';

    return reply.status(statusCode).send({
      statusCode,
      error: error.name || 'Error',
      message
    });
  });

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.fatal(error, 'Uncaught exception');
    Sentry.captureException(error);
    process.exit(1);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.fatal({ reason, promise }, 'Unhandled rejection');
    Sentry.captureException(reason);
  });
}

export default fp(errorHandler, {
  name: 'error-handler'
});