import { prisma } from '../../shared/db/prisma.js';
import type {
  CategoriesRepository,
  CategoryDTO,
} from '../../domain/repositories/categories-repository.js';

function slugify(input: string) {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function map(c: any): CategoryDTO {
  return { id: c.id, name: c.name, slug: c.slug };
}

export class PrismaCategoriesRepository implements CategoriesRepository {
  async listAll() {
    const rows = await prisma.category.findMany({ orderBy: { name: 'asc' } });
    return rows.map(map);
  }

  async findById(id: string) {
    const c = await prisma.category.findUnique({ where: { id } });
    return c ? map(c) : null;
  }

  async findBySlug(slug: string) {
    const c = await prisma.category.findUnique({ where: { slug } });
    return c ? map(c) : null;
  }

  async create(data: { name: string; slug?: string }) {
    const slug = data.slug?.trim() || slugify(data.name);
    const c = await prisma.category.create({
      data: { name: data.name.trim(), slug },
    });
    return map(c);
  }

  async update(id: string, data: { name?: string; slug?: string }) {
    const c = await prisma.category.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.slug !== undefined ? { slug: data.slug.trim() || slugify(data.name ?? '') } : {}),
      },
    });
    return map(c);
  }

  async delete(id: string) {
    await prisma.category.delete({ where: { id } });
  }
}
