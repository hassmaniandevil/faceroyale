/**
 * tRPC Context
 */

import { inferAsyncReturnType } from '@trpc/server';
import { CreateExpressContextOptions } from '@trpc/server/adapters/express';
import jwt from 'jsonwebtoken';
import { prisma } from '@faceroyale/database';

export async function createContext({ req }: CreateExpressContextOptions) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  let user = null;

  if (token) {
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'dev-secret'
      ) as { userId: string };

      user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: {
          id: true,
          username: true,
          email: true,
          isGuest: true,
          isBanned: true,
        },
      });

      if (user?.isBanned) {
        user = null;
      }
    } catch {
      // Invalid token, user remains null
    }
  }

  return {
    user,
    prisma,
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;
