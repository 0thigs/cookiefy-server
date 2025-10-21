import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  createReviewSchema,
  updateReviewSchema,
  reviewsPaginationSchema,
  reviewOut,
  paginatedReviewsOut,
  averageRatingOut,
} from '../../validators/reviews.schemas.js';
import { PrismaReviewsRepository } from '../../../infrastructure/repositories/prisma-reviews-repository.js';
import { CreateReview } from '../../../application/reviews/create-review-use-case.js';
import { UpdateReview } from '../../../application/reviews/update-review-use-case.js';
import { DeleteReview } from '../../../application/reviews/delete-review-use-case.js';
import { ListReviews } from '../../../application/reviews/list-reviews-use-case.js';

export async function reviewsRoutes(app: FastifyInstance) {
  const reviewsRepo = new PrismaReviewsRepository();
  const createReviewUseCase = new CreateReview(reviewsRepo);
  const updateReviewUseCase = new UpdateReview(reviewsRepo);
  const deleteReviewUseCase = new DeleteReview(reviewsRepo);
  const listReviewsUseCase = new ListReviews(reviewsRepo);

  // Criar uma avaliação para uma receita
  app.post(
    '/recipes/:recipeId/reviews',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Reviews'],
        params: z.object({ recipeId: z.string().min(1) }),
        body: createReviewSchema,
        response: {
          201: reviewOut.omit({ user: true }),
        },
      },
    },
    async (req, reply) => {
      const { recipeId } = req.params as { recipeId: string };
      const userId = (req.user as any).sub as string;
      const body = createReviewSchema.parse(req.body);

      try {
        const review = await createReviewUseCase.execute({
          recipeId,
          userId,
          rating: body.rating,
          comment: body.comment,
        });

        return reply.status(201).send({
          id: review.id,
          recipeId: review.recipeId,
          userId: review.userId,
          rating: review.rating,
          comment: review.comment ?? null,
          createdAt: review.createdAt.toISOString(),
          updatedAt: review.updatedAt.toISOString(),
        });
      } catch (error: any) {
        if (error.statusCode) {
          return reply.status(error.statusCode).send({ message: error.message });
        }
        throw error;
      }
    }
  );

  // Atualizar uma avaliação
  app.put(
    '/reviews/:id',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Reviews'],
        params: z.object({ id: z.string().min(1) }),
        body: updateReviewSchema,
        response: {
          200: reviewOut.omit({ user: true }),
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const userId = (req.user as any).sub as string;
      const body = updateReviewSchema.parse(req.body);

      try {
        const review = await updateReviewUseCase.execute({
          id,
          userId,
          rating: body.rating,
          comment: body.comment,
        });

        return reply.send({
          id: review.id,
          recipeId: review.recipeId,
          userId: review.userId,
          rating: review.rating,
          comment: review.comment ?? null,
          createdAt: review.createdAt.toISOString(),
          updatedAt: review.updatedAt.toISOString(),
        });
      } catch (error: any) {
        if (error.statusCode) {
          return reply.status(error.statusCode).send({ message: error.message });
        }
        throw error;
      }
    }
  );

  // Deletar uma avaliação
  app.delete(
    '/reviews/:id',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Reviews'],
        params: z.object({ id: z.string().min(1) }),
        response: {
          204: z.null(),
        },
      },
    },
    async (req, reply) => {
      const { id } = req.params as { id: string };
      const userId = (req.user as any).sub as string;

      try {
        await deleteReviewUseCase.execute(id, userId);
        return reply.status(204).send();
      } catch (error: any) {
        if (error.statusCode) {
          return reply.status(error.statusCode).send({ message: error.message });
        }
        throw error;
      }
    }
  );

  // Listar avaliações de uma receita (paginado)
  app.get(
    '/recipes/:recipeId/reviews',
    {
      schema: {
        tags: ['Reviews'],
        params: z.object({ recipeId: z.string().min(1) }),
        querystring: reviewsPaginationSchema,
        response: {
          200: paginatedReviewsOut,
        },
      },
    },
    async (req) => {
      const { recipeId } = req.params as { recipeId: string };
      const { page, pageSize } = reviewsPaginationSchema.parse(req.query);

      const result = await listReviewsUseCase.byRecipe(recipeId, { page, pageSize });

      return {
        data: result.items.map((r) => ({
          id: r.id,
          recipeId: r.recipeId,
          userId: r.userId,
          rating: r.rating,
          comment: r.comment ?? null,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
          user: {
            id: r.user.id,
            name: r.user.name,
            photoUrl: r.user.photoUrl ?? null,
          },
        })),
        meta: {
          page: result.page,
          pageSize: result.pageSize,
          total: result.total,
        },
      };
    }
  );

  // Obter média de avaliações de uma receita
  app.get(
    '/recipes/:recipeId/reviews/average',
    {
      schema: {
        tags: ['Reviews'],
        params: z.object({ recipeId: z.string().min(1) }),
        response: {
          200: averageRatingOut,
        },
      },
    },
    async (req) => {
      const { recipeId } = req.params as { recipeId: string };

      const [averageRating, result] = await Promise.all([
        listReviewsUseCase.getAverageRating(recipeId),
        listReviewsUseCase.byRecipe(recipeId, { page: 1, pageSize: 1 }),
      ]);

      return {
        averageRating: averageRating ?? null,
        totalReviews: result.total,
      };
    }
  );

  // Obter avaliação do usuário autenticado para uma receita
  app.get(
    '/recipes/:recipeId/reviews/mine',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Reviews'],
        params: z.object({ recipeId: z.string().min(1) }),
        response: {
          200: reviewOut.omit({ user: true }).nullable(),
        },
      },
    },
    async (req, reply) => {
      const { recipeId } = req.params as { recipeId: string };
      const userId = (req.user as any).sub as string;

      const review = await listReviewsUseCase.getUserReviewForRecipe(userId, recipeId);

      if (!review) {
        return reply.send(null);
      }

      return reply.send({
        id: review.id,
        recipeId: review.recipeId,
        userId: review.userId,
        rating: review.rating,
        comment: review.comment ?? null,
        createdAt: review.createdAt.toISOString(),
        updatedAt: review.updatedAt.toISOString(),
      });
    }
  );
}
