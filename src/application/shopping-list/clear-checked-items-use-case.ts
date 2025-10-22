import type { ShoppingListRepository } from '../../domain/repositories/shopping-list-repository.js';

export class ClearCheckedItems {
  constructor(private shoppingListRepo: ShoppingListRepository) {}

  async execute(userId: string) {
    const list = await this.shoppingListRepo.getOrCreateDefaultList(userId);
    await this.shoppingListRepo.clearCheckedItems(list.id);
  }
}
