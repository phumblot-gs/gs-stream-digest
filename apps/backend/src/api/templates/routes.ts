import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db, digestTemplates, digests } from '@gs-digest/database';
import { eq, desc, sql } from 'drizzle-orm';
import { EmailRenderer } from '@gs-digest/email-templates';
import { randomUUID } from 'crypto';
import { Sentry } from '../../utils/sentry';

const createTemplateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  subjectLiquid: z.string().min(1),
  bodyHtmlLiquid: z.string().min(1),
  bodyTextLiquid: z.string().optional(),
  isGlobal: z.boolean().default(false),
  isDefault: z.boolean().default(false),
  previewData: z.any().optional()
});

const updateTemplateSchema = createTemplateSchema.partial().extend({
  name: z.string().min(1).optional(),
  subjectLiquid: z.string().min(1).optional(),
  bodyHtmlLiquid: z.string().min(1).optional()
});

const previewTemplateSchema = z.object({
  subjectLiquid: z.string().min(1),
  bodyHtmlLiquid: z.string().min(1),
  bodyTextLiquid: z.string().optional(),
  previewData: z.any()
});

const templateRoutes: FastifyPluginAsync = async (fastify) => {
  // List all templates with digest count
  fastify.get('/', async (request, reply) => {
    try {
      // Get all templates
      const allTemplates = await db
        .select()
        .from(digestTemplates)
        .orderBy(desc(digestTemplates.createdAt));

      // Get digest counts for all templates in one query
      const digestCounts = await db
        .select({
          templateId: digests.templateId,
          count: sql<number>`COUNT(*)`.as('count')
        })
        .from(digests)
        .where(sql`${digests.templateId} IS NOT NULL`)
        .groupBy(digests.templateId);

      // Create a map of templateId -> count
      const countMap = new Map<string, number>();
      digestCounts.forEach(item => {
        if (item.templateId) {
          countMap.set(item.templateId, Number(item.count) || 0);
        }
      });

      // Combine templates with their counts
      const templates = allTemplates.map(template => ({
        ...template,
        digestCount: countMap.get(template.id) || 0
      }));

      return reply.send(templates);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch templates' });
    }
  });

  // Get single template
  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      const templates = await db.select().from(digestTemplates)
        .where(eq(digestTemplates.id, id))
        .limit(1);

      if (!templates.length) {
        return reply.status(404).send({ error: 'Template not found' });
      }

      return reply.send(templates[0]);
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch template' });
    }
  });

  // Get digests using a specific template
  fastify.get('/:id/digests', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      // Check if template exists
      const template = await db.select().from(digestTemplates)
        .where(eq(digestTemplates.id, id))
        .limit(1);

      if (!template.length) {
        return reply.status(404).send({ error: 'Template not found' });
      }

      // Get all digests using this template
      const templateDigests = await db.select({
        id: digests.id,
        name: digests.name,
        description: digests.description,
        isActive: digests.isActive,
        isPaused: digests.isPaused,
        createdAt: digests.createdAt,
        updatedAt: digests.updatedAt,
        lastCheckAt: digests.lastCheckAt,
        schedule: digests.schedule
      })
        .from(digests)
        .where(eq(digests.templateId, id))
        .orderBy(desc(digests.createdAt));

      return reply.send({
        template: template[0],
        digests: templateDigests,
        count: templateDigests.length
      });
    } catch (error) {
      fastify.log.error(error);
      
      // Send error to Sentry
      if (process.env.SENTRY_DSN) {
        Sentry.captureException(error, {
          contexts: {
            request: {
              method: request.method,
              url: request.url,
              params: request.params
            }
          }
        });
      }
      
      // Re-throw error to let Fastify error handler process it
      throw error;
    }
  });

  // Create new template
  fastify.post('/', async (request, reply) => {
    try {
      const data = createTemplateSchema.parse(request.body);

      // Validate Liquid syntax
      const renderer = new EmailRenderer();
      const validation = await renderer.validateAllTemplates(
        data.subjectLiquid,
        data.bodyHtmlLiquid,
        data.bodyTextLiquid
      );

      if (!validation.valid) {
        return reply.status(400).send({
          error: 'Invalid Liquid template syntax',
          details: validation.errors
        });
      }

<<<<<<< Updated upstream
=======
      // PostgreSQL handles timestamps with default functions

>>>>>>> Stashed changes
      const template: any = {
        id: randomUUID(),
        accountId: 'default', // TODO: Get from auth
        name: data.name,
        description: data.description || null,
        subjectLiquid: data.subjectLiquid,
        bodyHtmlLiquid: data.bodyHtmlLiquid,
        bodyTextLiquid: data.bodyTextLiquid || null,
        isGlobal: data.isGlobal,
        isDefault: data.isDefault,
        createdBy: 'system', // TODO: Get from auth
<<<<<<< Updated upstream
        createdAt: new Date(),
        updatedAt: new Date()
=======
>>>>>>> Stashed changes
      };

      // Handle previewData JSON serialization if provided
      if (data.previewData) {
        template.previewData = typeof data.previewData === 'object'
          ? JSON.stringify(data.previewData)
          : data.previewData;
      }

      await db.insert(digestTemplates).values(template);

      return reply.status(201).send(template);
    } catch (error) {
      fastify.log.error(error);
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid request data', details: error.errors });
      }
      return reply.status(500).send({ error: 'Failed to create template: ' + (error as any).message });
    }
  });

  // Update template
  fastify.put('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = updateTemplateSchema.parse(request.body);

      // Fetch existing template
      const templates = await db.select().from(digestTemplates)
        .where(eq(digestTemplates.id, id))
        .limit(1);

      if (!templates.length) {
        return reply.status(404).send({ error: 'Template not found' });
      }

      // Prepare update data - only include non-undefined fields
<<<<<<< Updated upstream
      const updateData: any = {
        updatedAt: new Date()
      };
=======
      const updateData: any = {};
>>>>>>> Stashed changes

      // Add fields from data, filtering out undefined values
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.subjectLiquid !== undefined) updateData.subjectLiquid = data.subjectLiquid;
      if (data.bodyHtmlLiquid !== undefined) updateData.bodyHtmlLiquid = data.bodyHtmlLiquid;
      if (data.bodyTextLiquid !== undefined) updateData.bodyTextLiquid = data.bodyTextLiquid;
      if (data.isGlobal !== undefined) updateData.isGlobal = data.isGlobal;
      if (data.isDefault !== undefined) updateData.isDefault = data.isDefault;

      // Handle previewData JSON serialization if provided
      if (data.previewData !== undefined) {
        updateData.previewData = typeof data.previewData === 'object'
          ? JSON.stringify(data.previewData)
          : data.previewData;
      }

      // Validate Liquid syntax for fields being updated
      const renderer = new EmailRenderer();
      const subjectToValidate = data.subjectLiquid !== undefined ? data.subjectLiquid : templates[0].subjectLiquid;
      const htmlToValidate = data.bodyHtmlLiquid !== undefined ? data.bodyHtmlLiquid : templates[0].bodyHtmlLiquid;
      const textToValidate = data.bodyTextLiquid !== undefined 
        ? data.bodyTextLiquid 
        : (templates[0].bodyTextLiquid || undefined);

      const validation = await renderer.validateAllTemplates(
        subjectToValidate,
        htmlToValidate,
        textToValidate
      );

      if (!validation.valid) {
        return reply.status(400).send({
          error: 'Invalid Liquid template syntax',
          message: 'Erreurs de syntaxe Liquid détectées dans le template',
          details: validation.errors
        });
      }

      await db.update(digestTemplates)
        .set(updateData)
        .where(eq(digestTemplates.id, id));

      const updatedTemplate = { ...templates[0], ...updateData };

      return reply.send(updatedTemplate);
    } catch (error) {
      fastify.log.error(error);
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid request data', details: error.errors });
      }
      return reply.status(500).send({ error: 'Failed to update template: ' + (error as any).message });
    }
  });

  // Delete template (only if not in use)
  fastify.delete('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      // Fetch existing template
      const templates = await db.select().from(digestTemplates)
        .where(eq(digestTemplates.id, id))
        .limit(1);

      if (!templates.length) {
        return reply.status(404).send({ error: 'Template not found' });
      }

      // Check if template is used by any digest
      const digestsUsingTemplate = await db.select()
        .from(digests)
        .where(eq(digests.templateId, id))
        .limit(1);

      if (digestsUsingTemplate.length > 0) {
        const count = await db.select({ count: sql<number>`count(*)` })
          .from(digests)
          .where(eq(digests.templateId, id));

        return reply.status(400).send({
          error: 'Template is in use',
          message: `Ce template est utilisé par ${count[0].count} digest(s). Veuillez d'abord modifier ces digests pour utiliser un autre template.`
        });
      }

      // Safe to delete
      await db.delete(digestTemplates)
        .where(eq(digestTemplates.id, id));

      return reply.status(204).send();
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to delete template' });
    }
  });

  // Preview template
  fastify.post('/preview', async (request, reply) => {
    try {
      const data = previewTemplateSchema.parse(request.body);
      const { subjectLiquid, bodyHtmlLiquid, bodyTextLiquid, previewData } = data;

      const renderer = new EmailRenderer();

      // Validate Liquid syntax before rendering
      const validation = await renderer.validateAllTemplates(
        subjectLiquid,
        bodyHtmlLiquid,
        bodyTextLiquid
      );

      if (!validation.valid) {
        return reply.status(400).send({
          error: 'Invalid Liquid template syntax',
          message: 'Erreurs de syntaxe Liquid détectées dans le template',
          details: validation.errors
        });
      }

      // Render templates
      const subject = await renderer.renderSubject(subjectLiquid, previewData);
      const bodyHtml = await renderer.renderHtml(bodyHtmlLiquid, previewData);
      const bodyText = bodyTextLiquid
        ? await renderer.renderHtml(bodyTextLiquid, previewData)
        : '';

      return reply.send({
        subject,
        bodyHtml,
        bodyText
      });
    } catch (error) {
      fastify.log.error(error);
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid request data', details: error.errors });
      }
      return reply.status(500).send({ 
        error: 'Failed to preview template',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
};

export default templateRoutes;