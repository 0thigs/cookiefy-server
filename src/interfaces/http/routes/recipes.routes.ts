import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  createRecipeFullSchema,
  paginationQuerySchema,
  publicListQuerySchema,
  recipeBriefOut,
  recipeDetailOut,
  paginatedRecipesOut,
  updateRecipeSchema,
} from '../../validators/recipes.schemas.js';
import { PrismaRecipesRepository } from '../../../infrastructure/repositories/prisma-recipes-repository.js';
import { PrismaUsersRepository } from '../../../infrastructure/repositories/prisma-users-repository.js';

export async function recipesRoutes(app: FastifyInstance) {
  const recipesRepo = new PrismaRecipesRepository();
  const usersRepo = new PrismaUsersRepository();

  app.post(
    '/',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Recipes'],
        body: createRecipeFullSchema,
        response: { 201: recipeBriefOut },
      },
    },
    async (req, reply) => {
      try {
        const input = createRecipeFullSchema.parse(req.body);
        const authorId = (req.user as any).sub as string;

        const recipe = await recipesRepo.createWithNested({ ...input, authorId });

        // Buscar dados do autor para incluir na resposta
        const author = await usersRepo.findById(authorId);
        if (!author) {
          throw new Error('Autor não encontrado');
        }

        return reply.status(201).send({
          id: recipe.id,
          title: input.title,
          description: input.description ?? null,
          authorId,
          author: {
            id: author.id,
            name: author.name,
            photoUrl: author.photoUrl,
          },
          createdAt: new Date().toISOString(),
        });
      } catch (error: any) {
        console.error('Erro ao criar receita:', error);
        
        // Se for erro de validação do Zod
        if (error.issues) {
          return reply.status(400).send({
            message: 'Dados inválidos',
            errors: error.issues,
          });
        }
        
        // Se for erro do Prisma
        if (error.code) {
          return reply.status(400).send({
            message: 'Erro no banco de dados',
            code: error.code,
          });
        }
        
        // Outros erros
        return reply.status(500).send({
          message: 'Erro interno do servidor',
          error: error.message,
        });
      }
    },
  );

  app.get(
    '/mine',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Recipes'],
        querystring: paginationQuerySchema,
        response: { 200: paginatedRecipesOut },
      },
    },
    async (req) => {
      const authorId = (req.user as any).sub as string;
      const { page, pageSize } = paginationQuerySchema.parse(req.query);
      const result = await recipesRepo.listByAuthor(authorId, { page, pageSize });
      return {
        data: result.items.map((r) => ({
          id: r.id,
          title: r.title,
          description: r.description ?? null,
          authorId: r.authorId,
          author: {
            id: r.author.id,
            name: r.author.name,
            photoUrl: r.author.photoUrl ?? null,
          },
          createdAt: r.createdAt.toISOString(),
        })),
        meta: { page: result.page, pageSize: result.pageSize, total: result.total },
      };
    },
  );

  // Rota para usuários autenticados (com isFavorited)
  app.get(
    '/',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Recipes'],
        querystring: publicListQuerySchema,
        response: { 200: paginatedRecipesOut },
      },
    },
    async (req) => {
      const {
        page,
        pageSize,
        q,
        difficulty,
        authorId,
        authorName,
        sort,
        categoryId,
        categorySlug,
        categoryIds,
        categorySlugs,
        categoryMatch,
        minPrep,
        maxPrep,
        minCook,
        maxCook,
        totalTimeMin,
        totalTimeMax,
        ingredient,
        ingredients,
        maxCalories,
        minProtein,
        maxCarbs,
        maxFat,
        minServings,
        maxServings,
      } = publicListQuerySchema.parse(req.query);

      // Obter userId do usuário autenticado
      const userId = (req.user as any)?.sub;

      const ingredientsList = ingredients
        ? ingredients
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

      const catIds = [
        ...(categoryId ? [categoryId] : []),
        ...(categoryIds
          ? categoryIds
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : []),
      ];
      const catSlugs = [
        ...(categorySlug ? [categorySlug] : []),
        ...(categorySlugs
          ? categorySlugs
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : []),
      ];

      const result = await recipesRepo.listPublic({
        page,
        pageSize,
        q,
        difficulty,
        authorId,
        authorName,
        sort,
        categoryId,
        categorySlug,
        categoryIds: catIds.length ? catIds : undefined,
        categorySlugs: catSlugs.length ? catSlugs : undefined,
        categoryMatch,
        minPrep,
        maxPrep,
        minCook,
        maxCook,
        totalTimeMin,
        totalTimeMax,
        ingredient,
        ingredients: ingredientsList,
        maxCalories,
        minProtein,
        maxCarbs,
        maxFat,
        minServings,
        maxServings,
        userId,
      });
      return {
        data: result.items.map((r) => ({
          id: r.id,
          title: r.title,
          description: r.description ?? null,
          authorId: r.authorId,
          author: {
            id: r.author.id,
            name: r.author.name,
            photoUrl: r.author.photoUrl ?? null,
          },
          createdAt: r.createdAt.toISOString(),
          isFavorited: r.isFavorited,
        })),
        meta: { page: result.page, pageSize: result.pageSize, total: result.total },
      };
    },
  );

  // Rota para usuários não autenticados (sem isFavorited)
  app.get(
    '/public',
    {
      schema: {
        tags: ['Recipes'],
        querystring: publicListQuerySchema,
        response: { 200: paginatedRecipesOut },
      },
    },
    async (req) => {
      const {
        page,
        pageSize,
        q,
        difficulty,
        authorId,
        authorName,
        sort,
        categoryId,
        categorySlug,
        categoryIds,
        categorySlugs,
        categoryMatch,
        minPrep,
        maxPrep,
        minCook,
        maxCook,
        totalTimeMin,
        totalTimeMax,
        ingredient,
        ingredients,
        maxCalories,
        minProtein,
        maxCarbs,
        maxFat,
        minServings,
        maxServings,
      } = publicListQuerySchema.parse(req.query);

      const ingredientsList = ingredients
        ? ingredients
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;

      const catIds = [
        ...(categoryId ? [categoryId] : []),
        ...(categoryIds
          ? categoryIds
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : []),
      ];
      const catSlugs = [
        ...(categorySlug ? [categorySlug] : []),
        ...(categorySlugs
          ? categorySlugs
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : []),
      ];

      const result = await recipesRepo.listPublic({
        page,
        pageSize,
        q,
        difficulty,
        authorId,
        authorName,
        sort,
        categoryId,
        categorySlug,
        categoryIds: catIds.length ? catIds : undefined,
        categorySlugs: catSlugs.length ? catSlugs : undefined,
        categoryMatch,
        minPrep,
        maxPrep,
        minCook,
        maxCook,
        totalTimeMin,
        totalTimeMax,
        ingredient,
        ingredients: ingredientsList,
        maxCalories,
        minProtein,
        maxCarbs,
        maxFat,
        minServings,
        maxServings,
        // Sem userId - não mostra isFavorited
      });
      return {
        data: result.items.map((r) => ({
          id: r.id,
          title: r.title,
          description: r.description ?? null,
          authorId: r.authorId,
          author: {
            id: r.author.id,
            name: r.author.name,
            photoUrl: r.author.photoUrl ?? null,
          },
          createdAt: r.createdAt.toISOString(),
          // isFavorited não incluído para usuários não autenticados
        })),
        meta: { page: result.page, pageSize: result.pageSize, total: result.total },
      };
    },
  );

  // Rota de detalhes para usuários autenticados (com isFavorited)
  app.get(
    '/:id',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Recipes'],
        params: z.object({ id: z.string().min(1) }),
        response: { 200: recipeDetailOut },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const userId = (req.user as any)?.sub;
      const detail = await recipesRepo.findPublicById(id, userId);
      if (!detail) return reply.notFound('Receita não encontrada');
      return {
        ...detail,
        createdAt: detail.createdAt.toISOString(),
        publishedAt: detail.publishedAt ? new Date(detail.publishedAt).toISOString() : null,
      };
    },
  );

  // Rota de detalhes para usuários não autenticados (sem isFavorited)
  app.get(
    '/:id/public',
    {
      schema: {
        tags: ['Recipes'],
        params: z.object({ id: z.string().min(1) }),
        response: { 200: recipeDetailOut },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const detail = await recipesRepo.findPublicById(id); // Sem userId
      if (!detail) return reply.notFound('Receita não encontrada');
      return {
        ...detail,
        createdAt: detail.createdAt.toISOString(),
        publishedAt: detail.publishedAt ? new Date(detail.publishedAt).toISOString() : null,
      };
    },
  );

  app.patch(
    '/:id',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Recipes'],
        params: z.object({ id: z.string().min(1) }),
        body: updateRecipeSchema,
        response: { 204: z.null() },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const actorId = (req.user as any).sub as string;
      const me = await usersRepo.findById(actorId);
      const isAdmin = me?.role === 'ADMIN';

      const data = updateRecipeSchema.parse(req.body);
      try {
        await recipesRepo.updateWithNested(id, actorId, !!isAdmin, data);
        return reply.status(204).send();
      } catch (e: any) {
        if (e?.message === 'NOT_FOUND') return reply.notFound('Receita não encontrada');
        throw e;
      }
    },
  );

  app.post(
    '/:id/publish',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Recipes'],
        params: z.object({ id: z.string().min(1) }),
        response: { 204: z.null() },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const actorId = (req.user as any).sub as string;
      const me = await usersRepo.findById(actorId);
      const isAdmin = me?.role === 'ADMIN';

      try {
        await recipesRepo.publish(id, actorId, !!isAdmin);
        return reply.status(204).send();
      } catch (e: any) {
        if (e?.message === 'NOT_FOUND') return reply.notFound('Receita não encontrada');
        throw e;
      }
    },
  );

  app.delete(
    '/:id',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Recipes'],
        params: z.object({ id: z.string().min(1) }),
        response: { 204: z.null() },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const actorId = (req.user as any).sub as string;
      const me = await usersRepo.findById(actorId);
      const isAdmin = me?.role === 'ADMIN';

      try {
        await recipesRepo.delete(id, actorId, !!isAdmin);
        return reply.status(204).send();
      } catch (e: any) {
        if (e?.message === 'NOT_FOUND') return reply.notFound('Receita não encontrada');
        throw e;
      }
    },
  );
}
