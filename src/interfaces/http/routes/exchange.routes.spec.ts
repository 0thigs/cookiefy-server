import { describe, it, expect, vi, beforeEach } from 'vitest';
import fastify from 'fastify';
import { serializerCompiler, validatorCompiler, ZodTypeProvider } from 'fastify-type-provider-zod';
import { exchangeRoutes } from './exchange.routes.js';
import jwt from 'jsonwebtoken';
import { PrismaUsersRepository } from '../../../infrastructure/repositories/prisma-users-repository.js';
import { prisma } from '../../../shared/db/prisma.js';

// Mock dependencies
vi.mock('jsonwebtoken');
vi.mock('../../../infrastructure/repositories/prisma-users-repository.js');
vi.mock('../../../shared/db/prisma.js', () => ({
  prisma: {
    account: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

describe('Exchange Routes', () => {
  let app: any;

  beforeEach(() => {
    app = fastify().withTypeProvider<ZodTypeProvider>();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);
    
    // Mock decorators added by registerJWT in the real server
    app.decorate('signAccess', () => 'mock-access-token');
    app.decorate('signRefresh', () => 'mock-refresh-token');
    app.decorate('authenticate', async () => {}); 
    app.decorate('setCookie', () => {}); // Mock setCookie if needed, though fastify usually handles it if plugin registered or just mocked

    // We need to register cookie plugin or mock the reply.setCookie
    // Since we are testing the route logic, we can just mock the reply.setCookie function if it's not available
    // But fastify inject handles cookies differently. 
    // Let's register fastify-cookie to be safe or mock it.
    // Actually, let's just register the route. If setCookie fails, we'll see.
    // The route uses `reply.setCookie`. We need `@fastify/cookie`.
    
    app.register(import('@fastify/cookie'));
    app.register(import('@fastify/sensible'));

    app.register(exchangeRoutes);
  });

  it('should exchange supabase token for access and refresh tokens (new user)', async () => {
    // Setup mocks
    const mockDecodedToken = {
      email: 'test@example.com',
      sub: 'supabase-user-id',
      user_metadata: {
        full_name: 'Test User',
        avatar_url: 'http://example.com/avatar.jpg',
      },
    };

    (jwt.verify as any).mockReturnValue(mockDecodedToken);

    const mockUser = {
      id: 'user-id-123',
      email: 'test@example.com',
    };

    // Mock repository behavior
    const findByEmailMock = vi.fn().mockResolvedValue(null); // User not found initially
    const createMock = vi.fn().mockResolvedValue(mockUser); // Create user

    (PrismaUsersRepository as any).mockImplementation(() => ({
      findByEmail: findByEmailMock,
      create: createMock,
    }));

    // Execute request
    const response = await app.inject({
      method: 'POST',
      url: '/supabase',
      payload: {
        token: 'valid-supabase-token',
      },
    });

    // Assertions
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body).toHaveProperty('token', 'mock-access-token');
    expect(body).toHaveProperty('expiresIn');

    // Verify interactions
    expect(jwt.verify).toHaveBeenCalledWith('valid-supabase-token', expect.any(String));
    expect(findByEmailMock).toHaveBeenCalledWith('test@example.com');
    expect(createMock).toHaveBeenCalledWith(expect.objectContaining({
      email: 'test@example.com',
      name: 'Test User',
    }));
    expect(prisma.account.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId: 'user-id-123',
        providerId: 'supabase-user-id',
      }),
    }));
  });

  it('should exchange supabase token for access and refresh tokens (existing user)', async () => {
    // Setup mocks
    const mockDecodedToken = {
      email: 'existing@example.com',
      sub: 'supabase-user-id-2',
    };

    (jwt.verify as any).mockReturnValue(mockDecodedToken);

    const mockUser = {
      id: 'user-id-456',
      email: 'existing@example.com',
    };

    // Mock repository behavior
    const findByEmailMock = vi.fn().mockResolvedValue(mockUser); // User found
    
    (PrismaUsersRepository as any).mockImplementation(() => ({
      findByEmail: findByEmailMock,
    }));

    // Mock account check
    (prisma.account.findUnique as any).mockResolvedValue(null); // Account doesn't exist yet for this provider
    (prisma.account.create as any).mockResolvedValue({});

    // Execute request
    const response = await app.inject({
      method: 'POST',
      url: '/supabase',
      payload: {
        token: 'valid-supabase-token',
      },
    });

    // Assertions
    expect(response.statusCode).toBe(200);
    
    // Verify interactions
    expect(findByEmailMock).toHaveBeenCalledWith('existing@example.com');
    expect(prisma.account.create).toHaveBeenCalled(); // Should link account
  });

  it('should return 401 for invalid token', async () => {
    (jwt.verify as any).mockImplementation(() => {
      throw new Error('Invalid token');
    });

    const response = await app.inject({
      method: 'POST',
      url: '/supabase',
      payload: {
        token: 'invalid-token',
      },
    });

    expect(response.statusCode).toBe(401);
  });
});
