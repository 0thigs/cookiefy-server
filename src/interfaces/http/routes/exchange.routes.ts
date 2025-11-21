import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { PrismaUsersRepository } from '../../../infrastructure/repositories/prisma-users-repository.js';
import { prisma } from '../../../shared/db/prisma.js';
import { env, IS_PROD } from '../../../config/env.js';

export async function exchangeRoutes(app: FastifyInstance) {
  const usersRepo = new PrismaUsersRepository();

  app.post(
    '/supabase',
    {
      schema: {
        tags: ['Auth'],
        body: z.object({ token: z.string() }),
        response: {
          200: z.object({
            token: z.string(),
            expiresIn: z.union([z.number(), z.string()]),
          }),
        },
      },
    },
    async (req, reply) => {
      const { token } = req.body as { token: string };

      let decoded: any;
      try {
        decoded = jwt.verify(token, env.SUPABASE_JWT_SECRET);
      } catch {
        return reply.unauthorized('Token do provedor inválido ou expirado');
      }

      const email = decoded.email;
      const providerId = decoded.sub;
      
      if (!email) return reply.badRequest('Email não encontrado no token');

      let user = await usersRepo.findByEmail(email);

      if (!user) {
        user = await usersRepo.create({
          email,
          name: decoded.user_metadata?.full_name || decoded.user_metadata?.name || 'Chef Cookiefy',
          photoUrl: decoded.user_metadata?.avatar_url || decoded.user_metadata?.picture,
          role: 'USER',
          passwordHash: null,
        });

        await prisma.account.create({
          data: {
            userId: user.id,
            provider: 'GOOGLE',
            providerId: providerId,
          },
        });
      } else {
        const accountExists = await prisma.account.findUnique({
          where: {
            provider_providerId: {
              provider: 'GOOGLE',
              providerId: providerId,
            },
          },
        });

        if (!accountExists) {
          await prisma.account.create({
            data: {
              userId: user.id,
              provider: 'GOOGLE',
              providerId: providerId,
            },
          });
        }
      }

      const accessToken = app.signAccess({ sub: user.id });
      const refreshToken = app.signRefresh({ sub: user.id });

      reply.setCookie('refreshToken', refreshToken, {
        httpOnly: true,
        sameSite: IS_PROD ? 'none' : 'lax',
        secure: IS_PROD,
        path: '/',
      });

      return { token: accessToken, expiresIn: env.JWT_ACCESS_TTL };
    },
  );
}
