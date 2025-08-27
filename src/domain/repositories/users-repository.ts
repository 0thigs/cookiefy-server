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
}
