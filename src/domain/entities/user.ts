export type Role = 'USER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  photoUrl?: string | null;
  role: Role;
  passwordHash?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
