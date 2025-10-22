import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { PrismaShoppingListRepository } from '../../../infrastructure/repositories/prisma-shopping-list-repository.js';
import { GetShoppingList } from '../../../application/shopping-list/get-shopping-list-use-case.js';
import { AddItemToShoppingList } from '../../../application/shopping-list/add-item-use-case.js';
import { UpdateShoppingListItem } from '../../../application/shopping-list/update-item-use-case.js';
import { DeleteShoppingListItem } from '../../../application/shopping-list/delete-item-use-case.js';
import { ToggleShoppingListItem } from '../../../application/shopping-list/toggle-item-use-case.js';
import { ClearCheckedItems } from '../../../application/shopping-list/clear-checked-items-use-case.js';
import { AddRecipeToShoppingList } from '../../../application/shopping-list/add-recipe-use-case.js';
import {
  addItemSchema,
  updateItemSchema,
  shoppingListOut,
  itemOut,
  addRecipeResponseOut,
} from '../../validators/shopping-list.schemas.js';

export async function shoppingListRoutes(app: FastifyInstance) {
  const repo = new PrismaShoppingListRepository();

  // Obter lista de compras do usuário
  app.get(
    '/',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Shopping List'],
        response: { 200: shoppingListOut },
      },
    },
    async (req) => {
      const userId = (req.user as any).sub as string;
      const useCase = new GetShoppingList(repo);
      const result = await useCase.execute(userId);

      return {
        list: {
          id: result.list.id,
          title: result.list.title,
          createdAt: result.list.createdAt.toISOString(),
          updatedAt: result.list.updatedAt.toISOString(),
        },
        items: result.items,
      };
    }
  );

  // Adicionar item à lista
  app.post(
    '/items',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Shopping List'],
        body: addItemSchema,
        response: { 201: itemOut },
      },
    },
    async (req, reply) => {
      const userId = (req.user as any).sub as string;
      const body = addItemSchema.parse(req.body);
      const useCase = new AddItemToShoppingList(repo);

      try {
        const item = await useCase.execute({ userId, ...body });
        return reply.status(201).send(item);
      } catch (error: any) {
        if (error.statusCode) {
          return reply.status(error.statusCode).send({ message: error.message });
        }
        throw error;
      }
    }
  );

  // Atualizar item da lista
  app.patch(
    '/items/:id',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Shopping List'],
        params: z.object({ id: z.string().min(1) }),
        body: updateItemSchema,
        response: { 200: itemOut },
      },
    },
    async (req, reply) => {
      const userId = (req.user as any).sub as string;
      const { id } = req.params as { id: string };
      const body = updateItemSchema.parse(req.body);
      const useCase = new UpdateShoppingListItem(repo);

      try {
        const item = await useCase.execute({ userId, itemId: id, ...body });
        return reply.send(item);
      } catch (error: any) {
        if (error.statusCode) {
          return reply.status(error.statusCode).send({ message: error.message });
        }
        throw error;
      }
    }
  );

  // Marcar/desmarcar item como concluído
  app.post(
    '/items/:id/toggle',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Shopping List'],
        params: z.object({ id: z.string().min(1) }),
        response: { 200: z.object({ id: z.string(), isChecked: z.boolean() }) },
      },
    },
    async (req, reply) => {
      const userId = (req.user as any).sub as string;
      const { id } = req.params as { id: string };
      const useCase = new ToggleShoppingListItem(repo);

      try {
        const result = await useCase.execute(userId, id);
        return reply.send(result);
      } catch (error: any) {
        if (error.statusCode) {
          return reply.status(error.statusCode).send({ message: error.message });
        }
        throw error;
      }
    }
  );

  // Deletar item da lista
  app.delete(
    '/items/:id',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Shopping List'],
        params: z.object({ id: z.string().min(1) }),
        response: { 204: z.null() },
      },
    },
    async (req, reply) => {
      const userId = (req.user as any).sub as string;
      const { id } = req.params as { id: string };
      const useCase = new DeleteShoppingListItem(repo);

      try {
        await useCase.execute(userId, id);
        return reply.status(204).send();
      } catch (error: any) {
        if (error.statusCode) {
          return reply.status(error.statusCode).send({ message: error.message });
        }
        throw error;
      }
    }
  );

  // Limpar itens marcados como concluídos
  app.delete(
    '/items/checked',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Shopping List'],
        response: { 204: z.null() },
      },
    },
    async (req, reply) => {
      const userId = (req.user as any).sub as string;
      const useCase = new ClearCheckedItems(repo);
      await useCase.execute(userId);
      return reply.status(204).send();
    }
  );

  // Adicionar ingredientes de uma receita à lista
  app.post(
    '/recipes/:recipeId',
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ['Shopping List'],
        params: z.object({ recipeId: z.string().min(1) }),
        response: { 200: addRecipeResponseOut },
      },
    },
    async (req, reply) => {
      const userId = (req.user as any).sub as string;
      const { recipeId } = req.params as { recipeId: string };
      const useCase = new AddRecipeToShoppingList(repo);

      try {
        const result = await useCase.execute(userId, recipeId);
        return reply.send(result);
      } catch (error: any) {
        if (error.statusCode) {
          return reply.status(error.statusCode).send({ message: error.message });
        }
        throw error;
      }
    }
  );
}
