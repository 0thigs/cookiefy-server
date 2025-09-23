import { prisma } from '../../shared/db/prisma.js';
import type { RecipesRepository } from '../../domain/repositories/recipe-repository.js';

export class PrismaRecipesRepository implements RecipesRepository {
  async create(data: { title: string; description?: string | null; authorId: string }) {
    const r = await prisma.recipe.create({ data });
    return {
      id: r.id,
      title: r.title,
      description: r.description ?? null,
      authorId: r.authorId,
      createdAt: r.createdAt,
    };
  }

  async listByAuthor(authorId: string, pagination: { page: number; pageSize: number }) {
    const { page, pageSize } = pagination;
    const skip = (page - 1) * pageSize;

    const [total, itemsRaw] = await Promise.all([
      prisma.recipe.count({ where: { authorId } }),
      prisma.recipe.findMany({
        where: { authorId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          author: {
            select: {
              id: true,
              name: true,
              photoUrl: true,
            },
          },
        },
      }),
    ]);

    const items = itemsRaw.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description ?? null,
      authorId: r.authorId,
      createdAt: r.createdAt,
      author: {
        id: r.author.id,
        name: r.author.name,
        photoUrl: r.author.photoUrl ?? null,
      },
    }));

    return { items, total, page, pageSize };
  }

  async createWithNested(data: {
    authorId: string;
    title: string;
    description?: string | null;
    difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
    prepMinutes?: number | null;
    cookMinutes?: number | null;
    servings?: number | null;
    nutrition?: any | null;
    steps?: Array<{ order: number; text: string; durationSec?: number | null }>;
    photos?: Array<{ url: string; alt?: string | null; order?: number }>;
    ingredients?: Array<{
      ingredientId?: string;
      name?: string;
      amount?: number | null;
      unit?: string | null;
    }>;
    categories?: Array<{ categoryId: string }>;
  }) {
    const r = await prisma.recipe.create({
      data: {
        authorId: data.authorId,
        title: data.title,
        description: data.description ?? null,
        difficulty: data.difficulty ?? undefined,
        prepMinutes: data.prepMinutes ?? undefined,
        cookMinutes: data.cookMinutes ?? undefined,
        servings: data.servings ?? undefined,
        nutrition: data.nutrition ?? undefined,
        steps:
          data.steps && data.steps.length > 0
            ? {
                create: data.steps.map((s) => ({
                  order: s.order,
                  text: s.text,
                  durationSec: s.durationSec ?? null,
                })),
              }
            : undefined,
        photos:
          data.photos && data.photos.length > 0
            ? {
                create: data.photos.map((p) => ({
                  url: p.url,
                  alt: p.alt ?? null,
                  order: p.order ?? 0,
                })),
              }
            : undefined,
        ingredients:
          data.ingredients && data.ingredients.length > 0
            ? {
                create: data.ingredients.map((i) => ({
                  amount: i.amount ?? null,
                  unit: i.unit ?? null,
                  ingredient: i.ingredientId
                    ? { connect: { id: i.ingredientId } }
                    : {
                        connectOrCreate: {
                          where: { name: i.name! },
                          create: { name: i.name! },
                        },
                      },
                })),
              }
            : undefined,
        categories:
          data.categories && data.categories.length > 0
            ? { create: data.categories.map((c) => ({ categoryId: c.categoryId })) }
            : undefined,
      },
    });

    return { id: r.id };
  }

  async updateWithNested(
    id: string,
    authorId: string,
    isAdmin: boolean,
    data: Partial<{
      title: string;
      description: string | null;
      difficulty: 'EASY' | 'MEDIUM' | 'HARD' | null;
      prepMinutes: number | null;
      cookMinutes: number | null;
      servings: number | null;
      nutrition: any | null;
      steps: Array<{ order: number; text: string; durationSec?: number | null }>;
      photos: Array<{ url: string; alt?: string | null; order?: number }>;
      ingredients: Array<{
        ingredientId?: string;
        name?: string;
        amount?: number | null;
        unit?: string | null;
      }>;
      categories: Array<{ categoryId: string }>;
    }>,
  ) {
    await prisma.$transaction(async (tx) => {
      const exists = await tx.recipe.findFirst({
        where: { id, ...(isAdmin ? {} : { authorId }) },
      });
      if (!exists) throw new Error('NOT_FOUND');

      await tx.recipe.update({
        where: { id },
        data: {
          ...(data.title !== undefined ? { title: data.title } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.difficulty !== undefined ? { difficulty: data.difficulty ?? null } : {}),
          ...(data.prepMinutes !== undefined ? { prepMinutes: data.prepMinutes } : {}),
          ...(data.cookMinutes !== undefined ? { cookMinutes: data.cookMinutes } : {}),
          ...(data.servings !== undefined ? { servings: data.servings } : {}),
          ...(data.nutrition !== undefined ? { nutrition: data.nutrition } : {}),
        },
      });

      if (data.steps) {
        await tx.step.deleteMany({ where: { recipeId: id } });
        if (data.steps.length > 0) {
          await tx.step.createMany({
            data: data.steps.map((s) => ({
              recipeId: id,
              order: s.order,
              text: s.text,
              durationSec: s.durationSec ?? null,
            })),
          });
        }
      }

      if (data.photos) {
        await tx.recipePhoto.deleteMany({ where: { recipeId: id } });
        if (data.photos.length > 0) {
          await tx.recipePhoto.createMany({
            data: data.photos.map((p) => ({
              recipeId: id,
              url: p.url,
              alt: p.alt ?? null,
              order: p.order ?? 0,
            })),
          });
        }
      }

      if (data.ingredients) {
        await tx.recipeIngredient.deleteMany({ where: { recipeId: id } });

        for (const i of data.ingredients) {
          let ingId = i.ingredientId;
          if (!ingId) {
            const ingr = await tx.ingredient.upsert({
              where: { name: i.name! },
              update: {},
              create: { name: i.name! },
            });
            ingId = ingr.id;
          }
          await tx.recipeIngredient.create({
            data: {
              recipeId: id,
              ingredientId: ingId!,
              amount: i.amount ?? null,
              unit: i.unit ?? null,
            },
          });
        }
      }

      if (data.categories) {
        await tx.recipeCategory.deleteMany({ where: { recipeId: id } });
        if (data.categories.length > 0) {
          await tx.recipeCategory.createMany({
            data: data.categories.map((c) => ({
              recipeId: id,
              categoryId: c.categoryId,
            })),
          });
        }
      }
    });
  }

  async publish(id: string, authorId: string, isAdmin: boolean) {
    const r = await prisma.recipe.updateMany({
      where: { id, ...(isAdmin ? {} : { authorId }) },
      data: { status: 'PUBLISHED', publishedAt: new Date() },
    });
    if (r.count === 0) throw new Error('NOT_FOUND');
  }

  async delete(id: string, authorId: string, isAdmin: boolean) {
    const r = await prisma.recipe.deleteMany({
      where: { id, ...(isAdmin ? {} : { authorId }) },
    });
    if (r.count === 0) throw new Error('NOT_FOUND');
  }

  async findPublicById(id: string) {
    const r = await prisma.recipe.findFirst({
      where: { id, status: 'PUBLISHED' },
      include: {
        author: true,
        steps: { orderBy: { order: 'asc' } },
        photos: { orderBy: { order: 'asc' } },
        ingredients: { include: { ingredient: true } },
        categories: { include: { category: true } },
      },
    });
    if (!r) return null;
    return this.mapDetail(r);
  }

  async findByIdForAuthor(id: string, authorId: string) {
    const r = await prisma.recipe.findFirst({
      where: { id, authorId },
      include: {
        author: true,
        steps: { orderBy: { order: 'asc' } },
        photos: { orderBy: { order: 'asc' } },
        ingredients: { include: { ingredient: true } },
        categories: { include: { category: true } },
      },
    });
    if (!r) return null;
    return this.mapDetail(r);
  }

  async listPublic(filters: {
    page: number;
    pageSize: number;
    q?: string;
    difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
    authorId?: string;
    authorName?: string;
    sort?: 'newest' | 'oldest' | 'title_asc' | 'title_desc' | 'prep_time_asc' | 'prep_time_desc' | 'cook_time_asc' | 'cook_time_desc';
    categoryId?: string;
    categorySlug?: string;
    categoryIds?: string[];
    categorySlugs?: string[];
    categoryMatch?: 'any' | 'all';
    minPrep?: number;
    maxPrep?: number;
    minCook?: number;
    maxCook?: number;
    totalTimeMin?: number;
    totalTimeMax?: number;
    ingredient?: string;
    ingredients?: string[];
    maxCalories?: number;
    minProtein?: number;
    maxCarbs?: number;
    maxFat?: number;
    minServings?: number;
    maxServings?: number;
  }) {
    const {
      page,
      pageSize,
      q,
      difficulty,
      authorId,
      authorName,
      sort = 'newest',
      categoryId,
      categorySlug,
      categoryIds,
      categorySlugs,
      categoryMatch = 'any',
      minPrep,
      maxPrep,
      minCook,
      maxCook,
      totalTimeMin,
      totalTimeMax,
      ingredient,
      ingredients,
      maxCalories,
      minProtein,
      maxCarbs,
      maxFat,
      minServings,
      maxServings,
    } = filters;

    const skip = (page - 1) * pageSize;

    const textWhere = q
      ? {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
            {
              ingredients: {
                some: { ingredient: { name: { contains: q, mode: 'insensitive' } } },
              },
            },
            {
              author: {
                name: { contains: q, mode: 'insensitive' },
              },
            },
          ],
        }
      : {};

    // Busca por nome do autor
    const authorNameWhere = authorName
      ? {
          author: {
            name: { contains: authorName, mode: 'insensitive' },
          },
        }
      : {};

    // Filtros por ingredientes (múltiplos)
    const ingredientsWhere =
      ingredients && ingredients.length > 0
        ? {
            AND: ingredients.map((name) => ({
              ingredients: {
                some: {
                  ingredient: {
                    name: { contains: name, mode: 'insensitive' },
                  },
                },
              },
            })),
          }
        : {};

    // Filtro por ingrediente único (compatibilidade)
    const singleIngredientWhere = ingredient
      ? {
          ingredients: {
            some: {
              ingredient: {
                name: { contains: ingredient, mode: 'insensitive' },
              },
            },
          },
        }
      : {};

    const prepWhere: any = {};
    if (minPrep !== undefined) prepWhere.gte = minPrep;
    if (maxPrep !== undefined) prepWhere.lte = maxPrep;

    const cookWhere: any = {};
    if (minCook !== undefined) cookWhere.gte = minCook;
    if (maxCook !== undefined) cookWhere.lte = maxCook;

    // Filtros por tempo total (prep + cook)
    const totalTimeWhere: any = {};
    if (totalTimeMin !== undefined || totalTimeMax !== undefined) {
      const totalTimeConditions: any[] = [];
      
      if (totalTimeMin !== undefined) {
        totalTimeConditions.push({
          AND: [
            { prepMinutes: { not: null } },
            { cookMinutes: { not: null } },
            {
              OR: [
                {
                  AND: [
                    { prepMinutes: { gte: 0 } },
                    { cookMinutes: { gte: 0 } },
                    {
                      // Soma prep + cook >= totalTimeMin
                      // Usando raw query seria melhor, mas vamos com uma aproximação
                    }
                  ]
                }
              ]
            }
          ]
        });
      }
      
      if (totalTimeMax !== undefined) {
        totalTimeConditions.push({
          AND: [
            { prepMinutes: { not: null } },
            { cookMinutes: { not: null } },
            {
              OR: [
                {
                  AND: [
                    { prepMinutes: { lte: totalTimeMax } },
                    { cookMinutes: { lte: totalTimeMax } },
                  ]
                }
              ]
            }
          ]
        });
      }
      
      if (totalTimeConditions.length > 0) {
        totalTimeWhere.OR = totalTimeConditions;
      }
    }

    // Filtros por porções
    const servingsWhere: any = {};
    if (minServings !== undefined) servingsWhere.gte = minServings;
    if (maxServings !== undefined) servingsWhere.lte = maxServings;

    const andConds: any[] = [];
    const orConds: any[] = [];

    if (categoryId) andConds.push({ categories: { some: { categoryId } } });
    if (categorySlug) andConds.push({ categories: { some: { category: { slug: categorySlug } } } });

    const multiById = (categoryIds ?? []).filter(Boolean);
    const multiBySlug = (categorySlugs ?? []).filter(Boolean);

    if (multiById.length || multiBySlug.length) {
      if (categoryMatch === 'any') {
        if (multiById.length) {
          orConds.push({ categories: { some: { categoryId: { in: multiById } } } });
        }
        if (multiBySlug.length) {
          orConds.push({ categories: { some: { category: { slug: { in: multiBySlug } } } } });
        }
      } else {
        for (const id of multiById) {
          andConds.push({ categories: { some: { categoryId: id } } });
        }
        for (const slug of multiBySlug) {
          andConds.push({ categories: { some: { category: { slug } } } });
        }
      }
    }

    const where: any = {
      status: 'PUBLISHED',
      ...(difficulty ? { difficulty } : {}),
      ...(authorId ? { authorId } : {}),
      ...authorNameWhere,
      ...(Object.keys(prepWhere).length ? { prepMinutes: prepWhere } : {}),
      ...(Object.keys(cookWhere).length ? { cookMinutes: cookWhere } : {}),
      ...(Object.keys(totalTimeWhere).length ? totalTimeWhere : {}),
      ...(Object.keys(servingsWhere).length ? { servings: servingsWhere } : {}),
      ...textWhere,
      ...ingredientsWhere,
      ...singleIngredientWhere,
      ...(andConds.length || orConds.length
        ? { AND: [...andConds, ...(orConds.length ? [{ OR: orConds }] : [])] }
        : {}),
    };

    let orderBy: any;
    switch (sort) {
      case 'oldest':
        orderBy = { publishedAt: 'asc' as const };
        break;
      case 'title_asc':
        orderBy = { title: 'asc' as const };
        break;
      case 'title_desc':
        orderBy = { title: 'desc' as const };
        break;
      case 'prep_time_asc':
        orderBy = { prepMinutes: 'asc' as const };
        break;
      case 'prep_time_desc':
        orderBy = { prepMinutes: 'desc' as const };
        break;
      case 'cook_time_asc':
        orderBy = { cookMinutes: 'asc' as const };
        break;
      case 'cook_time_desc':
        orderBy = { cookMinutes: 'desc' as const };
        break;
      case 'newest':
      default:
        orderBy = { publishedAt: 'desc' as const };
        break;
    }

    const [total, itemsRaw] = await Promise.all([
      prisma.recipe.count({ where }),
      prisma.recipe.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        select: {
          id: true,
          title: true,
          description: true,
          authorId: true,
          createdAt: true,
          author: {
            select: {
              id: true,
              name: true,
              photoUrl: true,
            },
          },
        },
      }),
    ]);

    const items = itemsRaw.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description ?? null,
      authorId: r.authorId,
      createdAt: r.createdAt,
      author: {
        id: r.author.id,
        name: r.author.name,
        photoUrl: r.author.photoUrl ?? null,
      },
    }));

    return { items, total, page, pageSize };
  }

  private mapDetail(r: any) {
    return {
      id: r.id,
      title: r.title,
      description: r.description ?? null,
      authorId: r.authorId,
      author: {
        id: r.author.id,
        name: r.author.name,
        photoUrl: r.author.photoUrl ?? null,
      },
      difficulty: r.difficulty ?? null,
      prepMinutes: r.prepMinutes ?? null,
      cookMinutes: r.cookMinutes ?? null,
      servings: r.servings ?? null,
      nutrition: r.nutrition ?? null,
      status: r.status,
      publishedAt: r.publishedAt ?? null,
      createdAt: r.createdAt,
      steps: r.steps.map((s: any) => ({
        order: s.order,
        text: s.text,
        durationSec: s.durationSec ?? null,
      })),
      photos: r.photos.map((p: any) => ({
        url: p.url,
        alt: p.alt ?? null,
        order: p.order,
      })),
      ingredients: r.ingredients.map((ri: any) => ({
        ingredientId: ri.ingredientId,
        name: ri.ingredient.name,
        amount: ri.amount ?? null,
        unit: ri.unit ?? null,
      })),
      categories: r.categories.map((rc: any) => ({
        id: rc.categoryId,
        name: rc.category.name,
        slug: rc.category.slug,
      })),
    };
  }
}
