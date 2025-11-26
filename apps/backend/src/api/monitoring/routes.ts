import { FastifyPluginAsync } from 'fastify';

const monitoringRoutes: FastifyPluginAsync = async (fastify) => {
  // TODO: Implement monitoring routes
  fastify.get('/stats', async (request, reply) => {
    return { stats: {} };
  });
};

export default monitoringRoutes;