import { prisma } from '../../shared/db/prisma.js';
import type { ShoppingListRepository } from '../../domain/repositories/shopping-list-repository.js';
import type { ShoppingList, ShoppingListItem } from '../../domain/entities/shopping-list.js';

export class PrismaShoppingListRepository implements ShoppingListRepository {
  async getOrCreateDefaultList(userId: string): Promise<ShoppingList> {
    // Buscar lista existente
    let list = await prisma.shoppingList.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' }, // Pega a mais antiga (primeira criada)
    });

    // Criar se não existir
    if (!list) {
      list = await prisma.shoppingList.create({
        data: {
          userId,
          title: 'Minha lista',
        },
      });
    }

    return list;
  }

  async listItems(listId: string) {
    const items = await prisma.shoppingListItem.findMany({
      where: { listId },
      orderBy: { isChecked: 'asc' }, // Não marcados primeiro
      include: {
        ingredient: {
          select: {
            id: true,
            name: true,
          },
        },
        recipe: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return items;
  }

  async addItem(data: {
    listId: string;
    ingredientId?: string | null;
    recipeId?: string | null;
    note?: string | null;
    amount?: number | null;
    unit?: string | null;
  }): Promise<ShoppingListItem> {
    const item = await prisma.shoppingListItem.create({
      data: {
        listId: data.listId,
        ingredientId: data.ingredientId,
        recipeId: data.recipeId,
        note: data.note,
        amount: data.amount,
        unit: data.unit,
        isChecked: false,
      },
    });

    return item;
  }

  async updateItem(
    itemId: string,
    listId: string,
    data: {
      note?: string | null;
      amount?: number | null;
      unit?: string | null;
      isChecked?: boolean;
    }
  ): Promise<ShoppingListItem> {
    const item = await prisma.shoppingListItem.updateMany({
      where: { id: itemId, listId },
      data: {
        ...(data.note !== undefined ? { note: data.note } : {}),
        ...(data.amount !== undefined ? { amount: data.amount } : {}),
        ...(data.unit !== undefined ? { unit: data.unit } : {}),
        ...(data.isChecked !== undefined ? { isChecked: data.isChecked } : {}),
      },
    });

    if (item.count === 0) {
      throw new Error('NOT_FOUND');
    }

    const updated = await prisma.shoppingListItem.findUnique({
      where: { id: itemId },
    });

    return updated!;
  }

  async deleteItem(itemId: string, listId: string): Promise<void> {
    const result = await prisma.shoppingListItem.deleteMany({
      where: { id: itemId, listId },
    });

    if (result.count === 0) {
      throw new Error('NOT_FOUND');
    }
  }

  async toggleItemChecked(itemId: string, listId: string): Promise<ShoppingListItem> {
    const item = await prisma.shoppingListItem.findFirst({
      where: { id: itemId, listId },
    });

    if (!item) {
      throw new Error('NOT_FOUND');
    }

    const updated = await prisma.shoppingListItem.update({
      where: { id: itemId },
      data: { isChecked: !item.isChecked },
    });

    return updated;
  }

  async clearCheckedItems(listId: string): Promise<void> {
    await prisma.shoppingListItem.deleteMany({
      where: { listId, isChecked: true },
    });
  }

  async addRecipeIngredients(listId: string, recipeId: string): Promise<number> {
    // Buscar receita com ingredientes
    const recipe = await prisma.recipe.findFirst({
      where: { id: recipeId, status: 'PUBLISHED' },
      include: {
        ingredients: {
          include: {
            ingredient: true,
          },
        },
      },
    });

    if (!recipe) {
      throw new Error('NOT_FOUND');
    }

    // Adicionar cada ingrediente à lista
    let count = 0;
    for (const ri of recipe.ingredients) {
      await prisma.shoppingListItem.create({
        data: {
          listId,
          ingredientId: ri.ingredientId,
          recipeId: recipe.id,
          amount: ri.amount,
          unit: ri.unit,
          isChecked: false,
        },
      });
      count++;
    }

    return count;
  }
}
