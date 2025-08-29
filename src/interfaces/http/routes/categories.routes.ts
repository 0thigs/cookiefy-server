import type { FastifyInstance, preHandlerHookHandler } from 'fastify';
import { PrismaCategoriesRepository } from '../../../infrastructure/repositories/prisma-categories-repository.js';
import { PrismaUsersRepository } from '../../../infrastructure/repositories/prisma-users-repository.js';
import {
  categoriesListOut,
  categoryOut,
  createCategorySchema,
  updateCategorySchema,
} from '../../validators/categories.schemas.js';
import { z } from 'zod';

export async function categoriesRoutes(app: FastifyInstance) {
  const repo = new PrismaCategoriesRepository();
  const users = new PrismaUsersRepository();

  const ensureAdmin: preHandlerHookHandler = async (req, reply) => {
    const userId = (req.user as any)?.sub as string | undefined;
    if (!userId) return reply.unauthorized();
    const u = await users.findById(userId);
    if (!u || u.role !== 'ADMIN') return reply.forbidden('Acesso restrito');
  };

  // pública
  app.get(
    '/',
    {
      schema: { tags: ['Categories'], response: { 200: categoriesListOut } },
    },
    async () => {
      const rows = await repo.listAll();
      return { data: rows };
    },
  );

  // admin
  app.post(
    '/',
    {
      preHandler: [app.authenticate, ensureAdmin],
      schema: { tags: ['Categories'], body: createCategorySchema, response: { 201: categoryOut } },
    },
    async (req, reply) => {
      const body = createCategorySchema.parse(req.body);
      const c = await repo.create(body);
      return reply.status(201).send(c);
    },
  );

  app.patch(
    '/:id',
    {
      preHandler: [app.authenticate, ensureAdmin],
      schema: {
        tags: ['Categories'],
        params: z.object({ id: z.string().min(1) }),
        body: updateCategorySchema,
        response: { 200: categoryOut },
      },
    },
    async (req) => {
      const { id } = req.params as { id: string };
      const body = updateCategorySchema.parse(req.body);
      const c = await repo.update(id, body);
      return c;
    },
  );

  app.delete(
    '/:id',
    {
      preHandler: [app.authenticate, ensureAdmin],
      schema: {
        tags: ['Categories'],
        params: z.object({ id: z.string().min(1) }),
        response: { 204: z.null() },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      await repo.delete(id);
      return reply.status(204).send();
    },
  );
}
