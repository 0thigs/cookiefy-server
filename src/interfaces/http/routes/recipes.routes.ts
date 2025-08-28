import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { createRecipeSchema } from '../../validators/recipes.schemas.js';
import { PrismaRecipesRepository } from '../../../infrastructure/repositories/prisma-recipes-repository.js';
import { CreateRecipe } from '../../../application/recipes/create-recipe-use-case.js';

// Schemas de resposta
const RecipeOut = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  authorId: z.string(),
  createdAt: z.string().datetime(),
});

const PaginationQuery = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
});

const PaginatedRecipes = z.object({
  data: z.array(RecipeOut),
  meta: z.object({
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
  }),
});

export async function recipesRoutes(app: FastifyInstance) {
  const recipesRepo = new PrismaRecipesRepository();

  app.post(
    '/',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Recipes'],
        body: createRecipeSchema,
        response: { 201: RecipeOut },
      },
    },
    async (req, reply) => {
      const input = createRecipeSchema.parse(req.body);
      const authorId = (req.user as any).sub as string;
      const useCase = new CreateRecipe(recipesRepo);
      const recipe = await useCase.execute({ ...input, authorId });
      return reply.status(201).send(recipe);
    },
  );

  app.get(
    '/mine',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Recipes'],
        querystring: PaginationQuery,
        response: { 200: PaginatedRecipes },
      },
    },
    async (req) => {
      const authorId = (req.user as any).sub as string;
      const { page, pageSize } = PaginationQuery.parse(req.query);
      const result = await recipesRepo.listByAuthor(authorId, { page, pageSize });
      return {
        data: result.items.map((r) => ({
          id: r.id,
          title: r.title,
          description: (r as any).description ?? null,
          authorId: r.authorId,
          createdAt: r.createdAt,
        })),
        meta: { page: result.page, pageSize: result.pageSize, total: result.total },
      };
    },
  );
}
