import { prisma } from '../../shared/db/prisma.js';
import type { FavoritesRepository } from '../../domain/repositories/favorites-repository.js';
import type { Recipe } from '../../domain/entities/recipe.js';

export class PrismaFavoritesRepository implements FavoritesRepository {
  async add(userId: string, recipeId: string) {
    const exists = await prisma.recipe.findFirst({ where: { id: recipeId, status: 'PUBLISHED' } });
    if (!exists) throw new Error('NOT_FOUND');

    await prisma.favorite.createMany({
      data: [{ userId, recipeId }],
      skipDuplicates: true,
    });
  }

  async remove(userId: string, recipeId: string) {
    await prisma.favorite.deleteMany({ where: { userId, recipeId } });
  }

  async isFavorited(userId: string, recipeId: string): Promise<boolean> {
    const favorite = await prisma.favorite.findFirst({
      where: { userId, recipeId },
    });
    return !!favorite;
  }

  async getFavoriteStatus(userId: string, recipeId: string): Promise<{ isFavorited: boolean; favoritedAt: Date | null }> {
    const favorite = await prisma.favorite.findFirst({
      where: { userId, recipeId },
      select: { createdAt: true },
    });
    
    return {
      isFavorited: !!favorite,
      favoritedAt: favorite?.createdAt || null,
    };
  }

  async listForUser(userId: string, pagination: { page: number; pageSize: number }) {
    const { page, pageSize } = pagination;
    const skip = (page - 1) * pageSize;

    const [total, rows] = await Promise.all([
      prisma.favorite.count({
        where: { userId, recipe: { status: 'PUBLISHED' } },
      }),
      prisma.favorite.findMany({
        where: { userId, recipe: { status: 'PUBLISHED' } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        select: {
          createdAt: true,
          recipe: {
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
              ingredients: {
                include: {
                  ingredient: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const items = rows.map((r) => ({
      id: r.recipe.id,
      title: r.recipe.title,
      description: r.recipe.description ?? null,
      authorId: r.recipe.authorId,
      author: {
        id: r.recipe.author.id,
        name: r.recipe.author.name,
        photoUrl: r.recipe.author.photoUrl ?? null,
      },
      createdAt: r.recipe.createdAt,
      favoritedAt: r.createdAt,
      ingredients: r.recipe.ingredients.map((ri: any) => ({
        ingredientId: ri.ingredientId,
        name: ri.ingredient.name,
        amount: ri.amount ?? null,
        unit: ri.unit ?? null,
      })),
    }));

    return { items, total, page, pageSize };
  }

  async listForUserWithFilters(userId: string, filters: {
    page: number;
    pageSize: number;
    q?: string;
    difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
    authorId?: string;
    authorName?: string;
    sort?: 'newest' | 'oldest' | 'title_asc' | 'title_desc' | 'prep_time_asc' | 'prep_time_desc' | 'cook_time_asc' | 'cook_time_desc' | 'favorited_asc' | 'favorited_desc';
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
      sort = 'favorited_desc',
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

    // Construir filtros de texto
    const textWhere = q
      ? {
          OR: [
            { recipe: { title: { contains: q, mode: 'insensitive' } } },
            { recipe: { description: { contains: q, mode: 'insensitive' } } },
            {
              recipe: {
                ingredients: {
                  some: { ingredient: { name: { contains: q, mode: 'insensitive' } } },
                },
              },
            },
            {
              recipe: {
                author: {
                  name: { contains: q, mode: 'insensitive' },
                },
              },
            },
          ],
        }
      : {};

    // Busca por nome do autor
    const authorNameWhere = authorName
      ? {
          recipe: {
            author: {
              name: { contains: authorName, mode: 'insensitive' },
            },
          },
        }
      : {};

    // Filtros por ingredientes
    const ingredientsWhere =
      ingredients && ingredients.length > 0
        ? {
            recipe: {
              AND: ingredients.map((name) => ({
                ingredients: {
                  some: {
                    ingredient: {
                      name: { contains: name, mode: 'insensitive' },
                    },
                  },
                },
              })),
            },
          }
        : {};

    const singleIngredientWhere = ingredient
      ? {
          recipe: {
            ingredients: {
              some: {
                ingredient: {
                  name: { contains: ingredient, mode: 'insensitive' },
                },
              },
            },
          },
        }
      : {};

    // Filtros por tempo
    const prepWhere: any = {};
    if (minPrep !== undefined) prepWhere.gte = minPrep;
    if (maxPrep !== undefined) prepWhere.lte = maxPrep;

    const cookWhere: any = {};
    if (minCook !== undefined) cookWhere.gte = minCook;
    if (maxCook !== undefined) cookWhere.lte = maxCook;

    // Filtros por porções
    const servingsWhere: any = {};
    if (minServings !== undefined) servingsWhere.gte = minServings;
    if (maxServings !== undefined) servingsWhere.lte = maxServings;

    // Construir condições de categoria
    const andConds: any[] = [];
    const orConds: any[] = [];

    if (categoryId) andConds.push({ recipe: { categories: { some: { categoryId } } } });
    if (categorySlug) andConds.push({ recipe: { categories: { some: { category: { slug: categorySlug } } } } });

    const multiById = (categoryIds ?? []).filter(Boolean);
    const multiBySlug = (categorySlugs ?? []).filter(Boolean);

    if (multiById.length || multiBySlug.length) {
      if (categoryMatch === 'any') {
        if (multiById.length) {
          orConds.push({ recipe: { categories: { some: { categoryId: { in: multiById } } } } });
        }
        if (multiBySlug.length) {
          orConds.push({ recipe: { categories: { some: { category: { slug: { in: multiBySlug } } } } } });
        }
      } else {
        for (const id of multiById) {
          andConds.push({ recipe: { categories: { some: { categoryId: id } } } });
        }
        for (const slug of multiBySlug) {
          andConds.push({ recipe: { categories: { some: { category: { slug } } } } });
        }
      }
    }

    // Construir WHERE final
    const where: any = {
      userId,
      recipe: {
        status: 'PUBLISHED',
        ...(difficulty ? { difficulty } : {}),
        ...(authorId ? { authorId } : {}),
        ...(Object.keys(prepWhere).length ? { prepMinutes: prepWhere } : {}),
        ...(Object.keys(cookWhere).length ? { cookMinutes: cookWhere } : {}),
        ...(Object.keys(servingsWhere).length ? { servings: servingsWhere } : {}),
      },
      ...textWhere,
      ...authorNameWhere,
      ...ingredientsWhere,
      ...singleIngredientWhere,
      ...(andConds.length || orConds.length
        ? { AND: [...andConds, ...(orConds.length ? [{ OR: orConds }] : [])] }
        : {}),
    };

    // Ordenação
    let orderBy: any;
    switch (sort) {
      case 'oldest':
        orderBy = { recipe: { publishedAt: 'asc' } };
        break;
      case 'title_asc':
        orderBy = { recipe: { title: 'asc' } };
        break;
      case 'title_desc':
        orderBy = { recipe: { title: 'desc' } };
        break;
      case 'prep_time_asc':
        orderBy = { recipe: { prepMinutes: 'asc' } };
        break;
      case 'prep_time_desc':
        orderBy = { recipe: { prepMinutes: 'desc' } };
        break;
      case 'cook_time_asc':
        orderBy = { recipe: { cookMinutes: 'asc' } };
        break;
      case 'cook_time_desc':
        orderBy = { recipe: { cookMinutes: 'desc' } };
        break;
      case 'favorited_asc':
        orderBy = { createdAt: 'asc' };
        break;
      case 'favorited_desc':
      default:
        orderBy = { createdAt: 'desc' };
        break;
    }

    const [total, rows] = await Promise.all([
      prisma.favorite.count({ where }),
      prisma.favorite.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        select: {
          createdAt: true,
          recipe: {
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
              ingredients: {
                include: {
                  ingredient: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const items = rows.map((r) => ({
      id: r.recipe.id,
      title: r.recipe.title,
      description: r.recipe.description ?? null,
      authorId: r.recipe.authorId,
      author: {
        id: r.recipe.author.id,
        name: r.recipe.author.name,
        photoUrl: r.recipe.author.photoUrl ?? null,
      },
      createdAt: r.recipe.createdAt,
      favoritedAt: r.createdAt,
      ingredients: r.recipe.ingredients.map((ri: any) => ({
        ingredientId: ri.ingredientId,
        name: ri.ingredient.name,
        amount: ri.amount ?? null,
        unit: ri.unit ?? null,
      })),
    }));

    return { items, total, page, pageSize };
  }

  async getStats(userId: string): Promise<{
    totalFavorites: number;
    recentFavorites: number;
    mostFavoritedCategory: string | null;
    averageRating: number | null;
  }> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [totalFavorites, recentFavorites, categoryStats] = await Promise.all([
      prisma.favorite.count({
        where: { userId, recipe: { status: 'PUBLISHED' } },
      }),
      prisma.favorite.count({
        where: {
          userId,
          recipe: { status: 'PUBLISHED' },
          createdAt: { gte: sevenDaysAgo },
        },
      }),
      prisma.favorite.groupBy({
        by: ['recipeId'],
        where: { userId, recipe: { status: 'PUBLISHED' } },
        _count: { recipeId: true },
        orderBy: { _count: { recipeId: 'desc' } },
        take: 1,
      }).then(async (result) => {
        if (result.length === 0) return null;
        
        const mostFavoritedRecipe = await prisma.recipe.findFirst({
          where: { id: result[0]?.recipeId },
          select: {
            categories: {
              select: {
                category: {
                  select: { name: true },
                },
              },
              take: 1,
            },
          },
        });
        
        return mostFavoritedRecipe?.categories[0]?.category.name || null;
      }),
    ]);

    // Calcular rating médio separadamente para evitar problemas de tipo
    let averageRating: number | null = null;
    try {
      const ratingResult = await prisma.review.aggregate({
        where: {
          recipe: {
            favorites: {
              some: { userId },
            },
            status: 'PUBLISHED',
          },
        },
        _avg: { rating: true },
      });
      averageRating = ratingResult._avg.rating;
    } catch (error) {
      // Se houver erro, manter como null
      averageRating = null;
    }

    return {
      totalFavorites,
      recentFavorites,
      mostFavoritedCategory: categoryStats,
      averageRating,
    };
  }
}
