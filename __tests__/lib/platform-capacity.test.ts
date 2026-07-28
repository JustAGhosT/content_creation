import type { PrismaClient } from '@prisma/client';
import { getPlatformCapacitySignals } from '@/lib/platforms/capacity';

describe('platform capacity signals', () => {
  test('surfaces a persisted payment code as a billing block', async () => {
    const store = {
      schedulerJob: {
        findFirst: jest.fn().mockResolvedValue({
          errorCode: 'PAYMENT_REQUIRED',
          error: 'Provider credits or billing required',
          updatedAt: new Date('2026-07-28T00:00:00.000Z'),
        }),
      },
    } as unknown as Pick<PrismaClient, 'schedulerJob'>;

    await expect(getPlatformCapacitySignals('user-1', store)).resolves.toEqual({
      twitter: {
        billingState: 'blocked',
        message:
          'The latest X publish was blocked because provider credits or billing are required.',
        lastCheckedAt: '2026-07-28T00:00:00.000Z',
      },
    });
  });

  test('recognizes legacy 402 errors recorded before structured codes', async () => {
    const store = {
      schedulerJob: {
        findFirst: jest.fn().mockResolvedValue({
          errorCode: null,
          error: 'Unknown HTTP error: X API error: 402',
          updatedAt: new Date('2026-07-27T14:32:21.296Z'),
        }),
      },
    } as unknown as Pick<PrismaClient, 'schedulerJob'>;

    const result = await getPlatformCapacitySignals('user-1', store);
    expect(result.twitter.billingState).toBe('blocked');
  });

  test('never invents a credit balance when provider evidence is absent', async () => {
    await expect(getPlatformCapacitySignals('user-1', null)).resolves.toEqual({
      twitter: {
        billingState: 'unverified',
        message: 'X exposes the exact credit balance only in its Developer Console.',
      },
    });
  });
});
