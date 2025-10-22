import type { ShoppingListRepository } from '../../domain/repositories/shopping-list-repository.js';
import { AppError } from '../../shared/errors.js';

export class AddItemToShoppingList {
  constructor(private shoppingListRepo: ShoppingListRepository) {}

  async execute(input: {
    userId: string;
    ingredientId?: string | null;
    recipeId?: string | null;
    note?: string | null;
    amount?: number | null;
    unit?: string | null;
  }) {
    const list = await this.shoppingListRepo.getOrCreateDefaultList(input.userId);

    // Validação: deve ter pelo menos ingredientId ou note
    if (!input.ingredientId && !input.note) {
      throw new AppError('Informe um ingrediente ou uma nota para o item', 400);
    }

    const item = await this.shoppingListRepo.addItem({
      listId: list.id,
      ingredientId: input.ingredientId,
      recipeId: input.recipeId,
      note: input.note,
      amount: input.amount,
      unit: input.unit,
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
  }
}
