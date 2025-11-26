import { FastifyPluginAsync } from 'fastify';

const emailRoutes: FastifyPluginAsync = async (fastify) => {
  // TODO: Implement email routes
  fastify.get('/', async (request, reply) => {
    return { emails: [] };
  });
};

export default emailRoutes;