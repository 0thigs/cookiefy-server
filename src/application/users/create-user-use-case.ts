import type { UsersRepository } from '../../domain/repositories/users-repository.js';
import { AppError } from '../../shared/errors.js';
import { hash } from '../../infrastructure/security/hash.js';

export class CreateUser {
  constructor(private users: UsersRepository) {}

  async execute(input: { email: string; name: string; password: string }) {
    const exists = await this.users.findByEmail(input.email);
    if (exists) throw new AppError('E-mail já cadastrado', 409);

    const passwordHash = await hash(input.password);
    const user = await this.users.create({ email: input.email, name: input.name, passwordHash });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    };
  }
}
