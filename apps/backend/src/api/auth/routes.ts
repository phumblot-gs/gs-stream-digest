import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import { createClient } from '@supabase/supabase-js';

const authRoutes: FastifyPluginAsync = async (fastify) => {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  );

  // POST /api/auth/login
  fastify.post(
    '/login',
    {
      schema: {
        tags: ['auth'],
        summary: 'Login with email and password',
        body: Type.Object({
          email: Type.String({ format: 'email' }),
          password: Type.String({ minLength: 6 })
        }),
        response: {
          200: Type.Object({
            token: Type.String(),
            user: Type.Any()
          })
        }
      }
    },
    async (request, reply) => {
      const { email, password } = request.body;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error || !data.session) {
        return reply.code(401).send({ error: 'Invalid credentials' });
      }

      // Generate JWT
      const token = fastify.jwt.sign({
        sub: data.user.id,
        email: data.user.email,
        role: data.user.user_metadata?.role || 'viewer',
        accountId: data.user.user_metadata?.account_id
      });

      return {
        token,
        user: data.user
      };
    }
  );

  // POST /api/auth/logout
  fastify.post('/logout', async (request, reply) => {
    // TODO: Implement logout
    return { success: true };
  });

  // GET /api/auth/me
  fastify.get('/me', async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Not authenticated' });
    }
    return request.user;
  });
};

export default authRoutes;