/**
 * tRPC Router for FaceRoyale API
 */

import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { nanoid } from 'nanoid';
import type { Context } from '../context';

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'dev-refresh-secret';

// Auth Router
const authRouter = router({
  guestLogin: publicProcedure
    .input(
      z.object({
        deviceId: z.string(),
        platform: z.enum(['web', 'ios', 'android']),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = await ctx.prisma.user.create({
        data: {
          id: nanoid(),
          username: `Player${Math.floor(Math.random() * 100000)}`,
          isGuest: true,
          deviceId: input.deviceId,
          profile: { create: {} },
          currencies: {
            create: [
              { currencyType: 'COINS', amount: 500 },
              { currencyType: 'GEMS', amount: 0 },
            ],
          },
        },
      });

      const accessToken = jwt.sign({ userId: user.id }, JWT_SECRET, {
        expiresIn: '1h',
      });
      const refreshToken = jwt.sign({ userId: user.id }, REFRESH_SECRET, {
        expiresIn: '30d',
      });

      return { accessToken, refreshToken, userId: user.id };
    }),

  register: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(8),
        username: z.string().min(3).max(20),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const existing = await ctx.prisma.user.findFirst({
        where: {
          OR: [{ email: input.email }, { username: input.username }],
        },
      });

      if (existing) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Email or username already exists',
        });
      }

      const passwordHash = await bcrypt.hash(input.password, 10);

      const user = await ctx.prisma.user.create({
        data: {
          id: nanoid(),
          email: input.email,
          passwordHash,
          username: input.username,
          isGuest: false,
          profile: { create: {} },
          currencies: {
            create: [
              { currencyType: 'COINS', amount: 500 },
              { currencyType: 'GEMS', amount: 0 },
            ],
          },
        },
      });

      const accessToken = jwt.sign({ userId: user.id }, JWT_SECRET, {
        expiresIn: '1h',
      });
      const refreshToken = jwt.sign({ userId: user.id }, REFRESH_SECRET, {
        expiresIn: '30d',
      });

      return { accessToken, refreshToken, userId: user.id };
    }),

  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { email: input.email },
      });

      if (!user || !user.passwordHash) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid credentials',
        });
      }

      const valid = await bcrypt.compare(input.password, user.passwordHash);
      if (!valid) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'Invalid credentials',
        });
      }

      const accessToken = jwt.sign({ userId: user.id }, JWT_SECRET, {
        expiresIn: '1h',
      });
      const refreshToken = jwt.sign({ userId: user.id }, REFRESH_SECRET, {
        expiresIn: '30d',
      });

      return { accessToken, refreshToken, userId: user.id };
    }),

  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { id: ctx.user.id },
      include: {
        profile: true,
        currencies: true,
      },
    });
    return user;
  }),
});

// Player Router
const playerRouter = router({
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.playerProfile.findUnique({
      where: { userId: ctx.user.id },
      include: {
        user: {
          select: { username: true, createdAt: true },
        },
      },
    });
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        username: z.string().min(3).max(20).optional(),
        avatarId: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (input.username) {
        await ctx.prisma.user.update({
          where: { id: ctx.user.id },
          data: { username: input.username },
        });
      }

      if (input.avatarId) {
        await ctx.prisma.playerProfile.update({
          where: { userId: ctx.user.id },
          data: { equippedSkin: input.avatarId },
        });
      }

      return { success: true };
    }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    const profile = await ctx.prisma.playerProfile.findUnique({
      where: { userId: ctx.user.id },
    });

    return {
      level: profile?.level ?? 1,
      totalXP: profile?.totalXP ?? 0,
      matchesPlayed: profile?.matchesPlayed ?? 0,
      wins: profile?.wins ?? 0,
      eliminations: profile?.eliminations ?? 0,
      winRate: profile?.matchesPlayed
        ? ((profile.wins / profile.matchesPlayed) * 100).toFixed(1)
        : '0',
    };
  }),
});

// Main Router
export const appRouter = router({
  auth: authRouter,
  player: playerRouter,
});

export type AppRouter = typeof appRouter;
