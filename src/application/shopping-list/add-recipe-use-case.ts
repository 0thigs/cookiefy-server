import type { ShoppingListRepository } from '../../domain/repositories/shopping-list-repository.js';
import { AppError } from '../../shared/errors.js';

export class AddRecipeToShoppingList {
  constructor(private shoppingListRepo: ShoppingListRepository) {}

  async execute(userId: string, recipeId: string) {
    const list = await this.shoppingListRepo.getOrCreateDefaultList(userId);

    try {
      const count = await this.shoppingListRepo.addRecipeIngredients(list.id, recipeId);
      return { count };
    } catch (e: any) {
      if (e?.message === 'NOT_FOUND') {
        throw new AppError('Receita não encontrada', 404);
      }
      throw e;
    }
  }
}
