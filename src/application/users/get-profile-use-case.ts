import type { UsersRepository } from '../../domain/repositories/users-repository.js';
import { AppError } from '../../shared/errors.js';

export class GetProfile {
  constructor(private users: UsersRepository) {}

  async execute(input: { userId: string }) {
    const u = await this.users.findById(input.userId);

    if (!u) throw new AppError('Usuário não encontrado', 404);

    return {
      id: u.id,
      email: u.email,
      name: u.name,
      photoUrl: u.photoUrl,
      createdAt: u.createdAt,
    };
  }
}
