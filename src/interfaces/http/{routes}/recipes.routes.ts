import type { FastifyInstance } from 'fastify';
import { createRecipeSchema } from '../../validators/recipes.schemas.js';
import { PrismaRecipesRepository } from '../../../infrastructure/repositories/prisma-recipes-repository.js';
import { CreateRecipe } from '../../../application/recipes/create-recipe-use-case.js';

export async function recipesRoutes(app: FastifyInstance) {
  const recipesRepo = new PrismaRecipesRepository();

  app.post('/', { preHandler: [app.authenticate] }, async (req, reply) => {
    const input = createRecipeSchema.parse(req.body);
    const authorId = (req.user as any).sub as string;
    const useCase = new CreateRecipe(recipesRepo);
    const recipe = await useCase.execute({ ...input, authorId });
    return reply.status(201).send(recipe);
  });

  app.get('/mine', { preHandler: [app.authenticate] }, async (req) => {
    const authorId = (req.user as any).sub as string;
    return recipesRepo.listByAuthor(authorId);
  });
}
