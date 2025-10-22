export interface ShoppingList {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShoppingListItem {
  id: string;
  listId: string;
  ingredientId?: string | null;
  recipeId?: string | null;
  note?: string | null;
  amount?: number | null;
  unit?: string | null;
  isChecked: boolean;
}
