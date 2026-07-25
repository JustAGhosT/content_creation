/**
 * Prisma Client Singleton
 *
 * This module ensures a single Prisma client instance is used throughout the app.
 * In development, it prevents hot-reload from creating multiple connections.
 *
 * SETUP REQUIRED:
 * 1. Run `pnpm run db:generate` to generate the Prisma client
 * 2. Run `pnpm run db:migrate:deploy` to apply committed migrations
 * 3. Set DATABASE_URL locally; Azure App Service supplies
 *    POSTGRESQLCONNSTR_DATABASE_URL through a Key Vault reference
 */

import type { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Get Prisma client instance
 *
 * Returns null if Prisma client hasn't been generated yet.
 * To generate: run `npx prisma generate`
 */
function createPrismaClient(): PrismaClient | null {
  const databaseUrl = process.env.DATABASE_URL ?? process.env.POSTGRESQLCONNSTR_DATABASE_URL;
  if (!databaseUrl) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Prisma] DATABASE_URL is not configured.');
    }
    return null;
  }

  try {
    // Dynamic import to avoid build errors when Prisma isn't set up

    const { PrismaClient: RuntimePrismaClient } =
      require('@prisma/client') as typeof import('@prisma/client');
    return new RuntimePrismaClient({
      adapter: new PrismaPg({ connectionString: databaseUrl }),
      log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
  } catch {
    if (process.env.NODE_ENV === 'development') {
      console.warn(
        '[Prisma] Client not available. Run `npx prisma generate` to set up the database.'
      );
    }
    return null;
  }
}

/**
 * Prisma client instance
 *
 * Uses a singleton pattern to prevent multiple database connections.
 * In development, the client is stored in globalThis to survive hot-reloads.
 * Returns null if Prisma isn't set up yet.
 */
export const prisma: PrismaClient | null = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production' && prisma) {
  globalForPrisma.prisma = prisma;
}

export default prisma;
