/** @jest-environment node */

import type { PrismaClient } from '@prisma/client';
import { AnalyticsPersistenceError, recordAnalyticsEvents } from '@/lib/analytics/repository';

describe('analytics repository', () => {
  test('resolves a campaign token to the server-owned tenant and campaign', async () => {
    const upsert = jest.fn(async ({ create }) => ({
      ...create,
      receivedAt: new Date('2026-08-09T01:00:00.000Z'),
    }));
    const client = {
      attributionLink: {
        findUnique: jest.fn().mockResolvedValue({
          campaign: {
            userId: 'owner-1',
            externalId: 'omnipost-x-live-001',
            id: 'campaign-row-1',
          },
          campaignVersion: { version: 1 },
        }),
      },
      analyticsEventRecord: { upsert },
    } as unknown as PrismaClient;

    await recordAnalyticsEvents(
      [
        {
          eventId: 'event:landing:1',
          name: 'landing_view',
          properties: {
            timestamp: '2026-08-09T01:00:00.000Z',
            campaignToken: 'mtk_omnipost_x_1',
            utmSource: 'x',
          },
        },
      ],
      null,
      client
    );

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          userId: 'owner-1',
          campaignId: 'omnipost-x-live-001',
          campaignVersion: 1,
        }),
      })
    );
  });

  test('rejects an unknown campaign token instead of storing orphan attribution', async () => {
    const client = {
      attributionLink: { findUnique: jest.fn().mockResolvedValue(null) },
      analyticsEventRecord: { upsert: jest.fn() },
    } as unknown as PrismaClient;

    await expect(
      recordAnalyticsEvents(
        [
          {
            eventId: 'event:landing:unknown',
            name: 'landing_view',
            properties: { campaignToken: 'mtk_unknown_campaign' },
          },
        ],
        null,
        client
      )
    ).rejects.toMatchObject<Partial<AnalyticsPersistenceError>>({
      code: 'UNKNOWN_CAMPAIGN_TOKEN',
    });
  });
});
