import type { UsersRepository } from '../../domain/repositories/users-repository.js';
import { AppError } from '../../shared/errors.js';

export class UpdateProfile {
  constructor(private users: UsersRepository) {}
  async execute(input: { userId: string; name?: string; photoUrl?: string | null }) {
    const exists = await this.users.findById(input.userId);
    if (!exists) throw new AppError('Usuário não encontrado', 404);

    const u = await this.users.update(input.userId, {
      name: input.name,
      photoUrl: input.photoUrl ?? null,
    });
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      photoUrl: u.photoUrl,
      createdAt: u.createdAt,
    };
  }
}
