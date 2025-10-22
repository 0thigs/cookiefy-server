import type { ShoppingListRepository } from '../../domain/repositories/shopping-list-repository.js';
import { AppError } from '../../shared/errors.js';

export class ToggleShoppingListItem {
  constructor(private shoppingListRepo: ShoppingListRepository) {}

  async execute(userId: string, itemId: string) {
    const list = await this.shoppingListRepo.getOrCreateDefaultList(userId);

    try {
      const item = await this.shoppingListRepo.toggleItemChecked(itemId, list.id);

      return {
        id: item.id,
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
