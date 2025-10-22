import type { ShoppingListRepository } from '../../domain/repositories/shopping-list-repository.js';
import { AppError } from '../../shared/errors.js';

export class DeleteShoppingListItem {
  constructor(private shoppingListRepo: ShoppingListRepository) {}

  async execute(userId: string, itemId: string) {
    const list = await this.shoppingListRepo.getOrCreateDefaultList(userId);

    try {
      await this.shoppingListRepo.deleteItem(itemId, list.id);
    } catch (e: any) {
      if (e?.message === 'NOT_FOUND') {
        throw new AppError('Item não encontrado', 404);
      }
      throw e;
    }
  }
}
