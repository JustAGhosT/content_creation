import type { PrismaClient } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';

export interface PlatformCapacitySignal {
  billingState: 'blocked' | 'unverified';
  message: string;
  lastCheckedAt?: string;
}

export interface PlatformCapacitySignals {
  twitter: PlatformCapacitySignal;
}

type CapacityStore = Pick<PrismaClient, 'schedulerJob'>;

export async function getPlatformCapacitySignals(
  userId: string,
  store: CapacityStore | null = prisma
): Promise<PlatformCapacitySignals> {
  const defaultSignal: PlatformCapacitySignal = {
    billingState: 'unverified',
    message: 'X exposes the exact credit balance only in its Developer Console.',
  };

  if (!store) return { twitter: defaultSignal };

  const latest = await store.schedulerJob.findFirst({
    where: { userId, platformId: 'twitter' },
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    select: { errorCode: true, error: true, updatedAt: true },
  });

  const paymentRequired =
    latest?.errorCode === 'PAYMENT_REQUIRED' || /(?:^|\D)402(?:\D|$)/.test(latest?.error ?? '');

  if (latest && paymentRequired) {
    return {
      twitter: {
        billingState: 'blocked',
        message:
          'The latest X publish was blocked because provider credits or billing are required.',
        lastCheckedAt: latest.updatedAt.toISOString(),
      },
    };
  }

  return { twitter: defaultSignal };
}
