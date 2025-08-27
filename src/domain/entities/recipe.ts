export interface Recipe {
  id: string;
  title: string;
  description?: string | null;
  authorId: string;
  createdAt: Date;
}
