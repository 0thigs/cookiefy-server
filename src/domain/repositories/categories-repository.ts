export interface CategoryDTO {
  id: string;
  name: string;
  slug: string;
}

export interface CategoriesRepository {
  listAll(): Promise<CategoryDTO[]>;
  findById(id: string): Promise<CategoryDTO | null>;
  findBySlug(slug: string): Promise<CategoryDTO | null>;
  create(data: { name: string; slug?: string }): Promise<CategoryDTO>;
  update(id: string, data: { name?: string; slug?: string }): Promise<CategoryDTO>;
  delete(id: string): Promise<void>;
}
