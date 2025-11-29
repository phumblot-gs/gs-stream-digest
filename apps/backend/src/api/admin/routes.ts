import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { getDb, applications, eventTypes } from '@gs-digest/database';
import { eq, desc, asc } from 'drizzle-orm';
import { randomUUID } from 'crypto';

// Schemas for applications
const createApplicationSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  description: z.string().optional(),
});

const updateApplicationSchema = createApplicationSchema.partial().extend({
  isActive: z.boolean().optional(),
});

// Schemas for event types
const createEventTypeSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
});

const updateEventTypeSchema = createEventTypeSchema.partial().extend({
  isActive: z.boolean().optional(),
});

const adminRoutes: FastifyPluginAsync = async (fastify) => {
  // TODO: Add authentication middleware to check for superadmin role
  // fastify.addHook('preHandler', requireSuperAdmin);

  // ===== Applications Routes =====

  // List all applications
  fastify.get('/applications', async (request, reply) => {
    try {
      const db = getDb();
      const apps = await db.select().from(applications)
        .orderBy(asc(applications.label));
      return reply.send(apps);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch applications' });
    }
  });

  // Get single application
  fastify.get('/applications/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const db = getDb();
      const apps = await db.select().from(applications)
        .where(eq(applications.id, id))
        .limit(1);

      if (!apps.length) {
        return reply.status(404).send({ error: 'Application not found' });
      }

      return reply.send(apps[0]);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch application' });
    }
  });

  // Create new application
  fastify.post('/applications', async (request, reply) => {
    try {
      const data = createApplicationSchema.parse(request.body);
      const db = getDb();

      const app = {
        id: randomUUID(),
        ...data,
        description: data.description || null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system', // TODO: Get from auth
      };

      await db.insert(applications).values(app);
      return reply.status(201).send(app);
    } catch (error) {
      fastify.log.error(error);
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid request data', details: error.errors });
      }
      return reply.status(500).send({ error: 'Failed to create application' });
    }
  });

  // Update application
  fastify.put('/applications/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = updateApplicationSchema.parse(request.body);
      const db = getDb();

      const apps = await db.select().from(applications)
        .where(eq(applications.id, id))
        .limit(1);

      if (!apps.length) {
        return reply.status(404).send({ error: 'Application not found' });
      }

      const updateData = {
        ...data,
        updatedAt: new Date(),
      };

      await db.update(applications)
        .set(updateData)
        .where(eq(applications.id, id));

      const updatedApp = { ...apps[0], ...updateData };
      return reply.send(updatedApp);
    } catch (error) {
      fastify.log.error(error);
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid request data', details: error.errors });
      }
      return reply.status(500).send({ error: 'Failed to update application' });
    }
  });

  // Delete application
  fastify.delete('/applications/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const db = getDb();

      const apps = await db.select().from(applications)
        .where(eq(applications.id, id))
        .limit(1);

      if (!apps.length) {
        return reply.status(404).send({ error: 'Application not found' });
      }

      await db.delete(applications)
        .where(eq(applications.id, id));

      return reply.status(204).send();
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to delete application' });
    }
  });

  // ===== Event Types Routes =====

  // List all event types
  fastify.get('/event-types', async (request, reply) => {
    try {
      const db = getDb();
      const types = await db.select().from(eventTypes)
        .orderBy(asc(eventTypes.label));
      return reply.send(types);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch event types' });
    }
  });

  // Get single event type
  fastify.get('/event-types/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const db = getDb();
      const types = await db.select().from(eventTypes)
        .where(eq(eventTypes.id, id))
        .limit(1);

      if (!types.length) {
        return reply.status(404).send({ error: 'Event type not found' });
      }

      return reply.send(types[0]);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch event type' });
    }
  });

  // Create new event type
  fastify.post('/event-types', async (request, reply) => {
    try {
      const data = createEventTypeSchema.parse(request.body);
      const db = getDb();

      const eventType = {
        id: randomUUID(),
        ...data,
        description: data.description || null,
        category: data.category || null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system', // TODO: Get from auth
      };

      await db.insert(eventTypes).values(eventType);
      return reply.status(201).send(eventType);
    } catch (error) {
      fastify.log.error(error);
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid request data', details: error.errors });
      }
      return reply.status(500).send({ error: 'Failed to create event type' });
    }
  });

  // Update event type
  fastify.put('/event-types/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = updateEventTypeSchema.parse(request.body);
      const db = getDb();

      const types = await db.select().from(eventTypes)
        .where(eq(eventTypes.id, id))
        .limit(1);

      if (!types.length) {
        return reply.status(404).send({ error: 'Event type not found' });
      }

      const updateData = {
        ...data,
        updatedAt: new Date(),
      };

      await db.update(eventTypes)
        .set(updateData)
        .where(eq(eventTypes.id, id));

      const updatedType = { ...types[0], ...updateData };
      return reply.send(updatedType);
    } catch (error) {
      fastify.log.error(error);
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid request data', details: error.errors });
      }
      return reply.status(500).send({ error: 'Failed to update event type' });
    }
  });

  // Delete event type
  fastify.delete('/event-types/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const db = getDb();

      const types = await db.select().from(eventTypes)
        .where(eq(eventTypes.id, id))
        .limit(1);

      if (!types.length) {
        return reply.status(404).send({ error: 'Event type not found' });
      }

      await db.delete(eventTypes)
        .where(eq(eventTypes.id, id));

      return reply.status(204).send();
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to delete event type' });
    }
  });
};

export default adminRoutes;