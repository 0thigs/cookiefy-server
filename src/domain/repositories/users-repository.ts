import type { User } from '../entities/user.js';

export interface UsersRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(data: {
    email: string;
    name: string;
    passwordHash?: string | null;
    photoUrl?: string | null;
    role?: 'USER' | 'ADMIN';
  }): Promise<User>;

  update(id: string, data: { name?: string; photoUrl?: string | null }): Promise<User>;
  getPublicProfile(id: string): Promise<{
    user: Pick<User, 'id' | 'name' | 'photoUrl'> & { createdAt: Date };
    stats: { recipes: number; reviews: number; favorites: number };
  } | null>;
}
