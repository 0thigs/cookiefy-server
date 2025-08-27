import { prisma } from '../../shared/db/prisma.js';
import type { UsersRepository } from '../../domain/repositories/users-repository.js';
import type { User } from '../../domain/entities/user.js';

function map(prismaUser: any): User {
  // mapeia explicitamente para o tipo de domínio
  return {
    id: prismaUser.id,
    email: prismaUser.email,
    name: prismaUser.name,
    photoUrl: prismaUser.photoUrl,
    role: prismaUser.role,
    passwordHash: prismaUser.passwordHash,
    createdAt: prismaUser.createdAt,
    updatedAt: prismaUser.updatedAt,
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
}
