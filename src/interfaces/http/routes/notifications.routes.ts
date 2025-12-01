import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { PrismaFavoritesRepository } from '../../../infrastructure/repositories/prisma-favorites-repository.js';

export async function notificationsRoutes(app: FastifyInstance) {
  const repo = new PrismaFavoritesRepository();

  app.post(
    '/',
    {
      schema: {
        tags: ['Notifications'],
      },
    },
    async (req, reply) => {
      try {
       const sendBroadcast = async () => {
        const ONE_SIGNAL_APP_ID = "561d9775-45a7-44d8-9324-5cf459f669ad";
        const ONE_SIGNAL_API_KEY = "os_v2_app_kyozo5kfu5cnrezelt2ft5tjvuajqflbmi2ep7m5zbxeh35ecf4uiobzl44ljeeyqgfmfopgjp64ybwqmoestu3r4y76i67a3jek6ly";

        const options = {
            method: 'POST',
            headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Basic ${ONE_SIGNAL_API_KEY}`,
            },
            body: JSON.stringify({
            app_id: ONE_SIGNAL_APP_ID,
            included_segments: ['Total Subscriptions'], // Isso define que é um Broadcast
            contents: { 
                en: 'Discover the new recipes available!', 
                pt: 'Conheça as novas receitas disponíveis!' 
            },
            headings: { 
                en: 'New Recipes Available!', 
                pt: 'Novas receitas disponíveis!' 
            },
            }),
        };

        try {
            const response = await fetch('https://onesignal.com/api/v1/notifications', options);
            const data = await response.json();

            if (!response.ok) {
            throw new Error(`Erro na API: ${JSON.stringify(data)}`);
            }

            console.log('Broadcast enviado com sucesso:', data);
            return reply.send(data);
        } catch (err) {
            console.error('Falha ao enviar broadcast:', err);
        }
        };

        return sendBroadcast();
      } catch (e: any) {
        throw e;
      }
    },
  )
}
