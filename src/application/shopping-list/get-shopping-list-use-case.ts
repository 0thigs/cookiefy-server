import type { ShoppingListRepository } from '../../domain/repositories/shopping-list-repository.js';

export class GetShoppingList {
  constructor(private shoppingListRepo: ShoppingListRepository) {}

  async execute(userId: string) {
    const list = await this.shoppingListRepo.getOrCreateDefaultList(userId);
    const items = await this.shoppingListRepo.listItems(list.id);

    return {
      list: {
        id: list.id,
        title: list.title,
        createdAt: list.createdAt,
        updatedAt: list.updatedAt,
      },
      items: items.map((item) => ({
        id: item.id,
        ingredientId: item.ingredientId ?? null,
        recipeId: item.recipeId ?? null,
        note: item.note ?? null,
        amount: item.amount ?? null,
        unit: item.unit ?? null,
        isChecked: item.isChecked,
        ingredient: item.ingredient
          ? { id: item.ingredient.id, name: item.ingredient.name }
          : null,
        recipe: item.recipe ? { id: item.recipe.id, title: item.recipe.title } : null,
      })),
    };
  }
}
