import { prisma } from '../../shared/db/prisma.js';
import type { UsersRepository } from '../../domain/repositories/users-repository.js';
import type { User } from '../../domain/entities/user.js';

function map(u: any): User {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    photoUrl: u.photoUrl,
    role: u.role,
    passwordHash: u.passwordHash,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

export class PrismaUsersRepository implements UsersRepository {
  async findByEmail(email: string) {
    const u = await prisma.user.findUnique({ where: { email } });
    return u ? map(u) : null;
  }

  async findById(id: string) {
    const u = await prisma.user.findUnique({ where: { id } });
    return u ? map(u) : null;
  }

  async create(data: {
    email: string;
    name: string;
    passwordHash?: string | null;
    photoUrl?: string | null;
    role?: 'USER' | 'ADMIN';
  }) {
    const u = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        photoUrl: data.photoUrl ?? null,
        role: (data.role as any) ?? 'USER',
        passwordHash: data.passwordHash ?? null,
      },
    });
    return map(u);
  }

  async update(id: string, data: { name?: string; photoUrl?: string | null }) {
    const u = await prisma.user.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.photoUrl !== undefined ? { photoUrl: data.photoUrl } : {}),
      },
    });
    return map(u);
  }

  async delete(id: string): Promise<void> {
    await prisma.user.delete({ where: { id } });
  }

  async getPublicProfile(id: string) {
    const u = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        photoUrl: true,
        createdAt: true,
        _count: {
          select: {
            recipes: true,
            reviews: true,
            favorites: true,
          },
        },
      },
    });
    if (!u) return null;
    return {
      user: { id: u.id, name: u.name, photoUrl: u.photoUrl, createdAt: u.createdAt },
      stats: {
        recipes: u._count.recipes,
        reviews: u._count.reviews,
        favorites: u._count.favorites,
      },
    };
  }
}
