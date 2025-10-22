import type { ShoppingList, ShoppingListItem } from '../entities/shopping-list.js';

export interface ShoppingListRepository {
  // Obter ou criar a lista padrão do usuário
  getOrCreateDefaultList(userId: string): Promise<ShoppingList>;

  // Listar todos os itens da lista
  listItems(listId: string): Promise<Array<ShoppingListItem & {
    ingredient?: { id: string; name: string } | null;
    recipe?: { id: string; title: string } | null;
  }>>;

  // Adicionar item à lista
  addItem(data: {
    listId: string;
    ingredientId?: string | null;
    recipeId?: string | null;
    note?: string | null;
    amount?: number | null;
    unit?: string | null;
  }): Promise<ShoppingListItem>;

  // Atualizar item da lista
  updateItem(
    itemId: string,
    listId: string,
    data: {
      note?: string | null;
      amount?: number | null;
      unit?: string | null;
      isChecked?: boolean;
    }
  ): Promise<ShoppingListItem>;

  // Deletar item da lista
  deleteItem(itemId: string, listId: string): Promise<void>;

  // Marcar/desmarcar item como concluído
  toggleItemChecked(itemId: string, listId: string): Promise<ShoppingListItem>;

  // Limpar itens marcados como concluídos
  clearCheckedItems(listId: string): Promise<void>;

  // Adicionar ingredientes de uma receita à lista
  addRecipeIngredients(listId: string, recipeId: string): Promise<number>;
}
