import type { ShoppingListRepository } from '../../domain/repositories/shopping-list-repository.js';
import { AppError } from '../../shared/errors.js';

export class UpdateShoppingListItem {
  constructor(private shoppingListRepo: ShoppingListRepository) {}

  async execute(input: {
    userId: string;
    itemId: string;
    note?: string | null;
    amount?: number | null;
    unit?: string | null;
    isChecked?: boolean;
  }) {
    const list = await this.shoppingListRepo.getOrCreateDefaultList(input.userId);

    try {
      const item = await this.shoppingListRepo.updateItem(input.itemId, list.id, {
        note: input.note,
        amount: input.amount,
        unit: input.unit,
        isChecked: input.isChecked,
      });

      return {
        id: item.id,
        ingredientId: item.ingredientId ?? null,
        recipeId: item.recipeId ?? null,
        note: item.note ?? null,
        amount: item.amount ?? null,
        unit: item.unit ?? null,
        isChecked: item.isChecked,
      };
    } catch (e: any) {
      if (e?.message === 'NOT_FOUND') {
        throw new AppError('Item não encontrado', 404);
      }
      throw e;
    }
  }
}
