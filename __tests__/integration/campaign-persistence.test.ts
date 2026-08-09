/** @jest-environment node */

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { omnipostXCampaignSeed } from '@/lib/seed/omnipost-x-campaign';

const databaseUrl = process.env.DATABASE_URL;
const describePostgres =
  databaseUrl?.startsWith('postgresql://') || databaseUrl?.startsWith('postgres://')
    ? describe
    : describe.skip;

describePostgres('campaign persistence restart behavior', () => {
  const testSuffix = `${process.pid}-${Date.now()}`;
  const ownerId = `campaign-owner-${testSuffix}`;
  const secondOwnerId = `second-owner-${testSuffix}`;
  let usersCreated = false;

  afterAll(async () => {
    const globalPrisma = globalThis as unknown as {
      prisma?: PrismaClient;
    };
    await globalPrisma.prisma?.$disconnect();
    globalPrisma.prisma = undefined;
    if (databaseUrl && usersCreated) {
      const cleanupClient = new PrismaClient({
        adapter: new PrismaPg({ connectionString: databaseUrl }),
      });
      await cleanupClient.user.deleteMany({
        where: { id: { in: [ownerId, secondOwnerId] } },
      });
      await cleanupClient.$disconnect();
    }
  });

  test('survives a client restart with immutable approval history', async () => {
    if (!databaseUrl) {
      throw new Error('PostgreSQL DATABASE_URL is required for this integration test.');
    }
    const setupClient = new PrismaClient({
      adapter: new PrismaPg({ connectionString: databaseUrl }),
    });
    await setupClient.user.createMany({
      data: [
        {
          id: ownerId,
          username: `campaign-owner-${testSuffix}`,
          email: `owner-${testSuffix}@example.test`,
          passwordHash: 'not-a-real-password-hash',
        },
        {
          id: secondOwnerId,
          username: `second-owner-${testSuffix}`,
          email: `second-${testSuffix}@example.test`,
          passwordHash: 'not-a-real-password-hash',
        },
      ],
    });
    usersCreated = true;
    await setupClient.$disconnect();

    jest.resetModules();
    const repository = await import('@/lib/campaigns/repository');
    const persisted = await repository.saveCampaignVersion({
      userId: ownerId,
      campaign: omnipostXCampaignSeed,
      source: 'git-import',
    });
    const contentId = omnipostXCampaignSeed.contentItems[0].id;
    const variantId = omnipostXCampaignSeed.contentItems[0].adaptations[0].variantId;
    const contentHash = persisted.contentHashes[contentId];
    await repository.recordApproval({
      userId: ownerId,
      campaignId: omnipostXCampaignSeed.id,
      version: persisted.version,
      contentId,
      variantId,
      state: 'approved',
      contentHash,
    });
    const secondTenant = await repository.saveCampaignVersion({
      userId: secondOwnerId,
      campaign: omnipostXCampaignSeed,
      source: 'git-import',
    });
    const attribution = {
      contentId,
      variantId,
      platformId: 'twitter',
      trackingToken: 'shared-canonical-token',
      utmId: 'omnipost-x-live-001',
      utmSource: 'x',
      utmMedium: 'social',
      utmCampaign: 'omnipost-x-live-001',
      utmContent: 'post-1',
    };
    await repository.recordAttributionLinks({
      userId: ownerId,
      campaignId: omnipostXCampaignSeed.id,
      version: persisted.version,
      links: [attribution],
    });
    await repository.recordAttributionLinks({
      userId: secondOwnerId,
      campaignId: omnipostXCampaignSeed.id,
      version: secondTenant.version,
      links: [attribution],
    });

    const analyticsClient = new PrismaClient({
      adapter: new PrismaPg({ connectionString: databaseUrl }),
    });
    const creationEvents = await analyticsClient.analyticsEventRecord.findMany({
      where: {
        name: 'campaign_created',
        userId: { in: [ownerId, secondOwnerId] },
      },
      orderBy: { userId: 'asc' },
    });
    await analyticsClient.$disconnect();
    expect(creationEvents).toHaveLength(2);
    expect(new Set(creationEvents.map(event => event.eventId)).size).toBe(2);
    expect(creationEvents.map(event => event.campaignId)).toEqual([
      omnipostXCampaignSeed.id,
      omnipostXCampaignSeed.id,
    ]);

    const globalPrisma = globalThis as unknown as {
      prisma?: PrismaClient;
    };
    await globalPrisma.prisma?.$disconnect();
    globalPrisma.prisma = undefined;
    jest.resetModules();

    const restartedRepository = await import('@/lib/campaigns/repository');
    const afterRestart = await restartedRepository.getCampaign(ownerId, omnipostXCampaignSeed.id);
    const approvalBinding = await restartedRepository.assertApprovedForQueue({
      userId: ownerId,
      campaignId: omnipostXCampaignSeed.id,
      version: afterRestart.version,
      contentId,
      variantId,
      platformId: 'twitter',
      contentHash,
    });

    expect(afterRestart.snapshotHash).toBe(persisted.snapshotHash);
    expect(approvalBinding).toEqual({
      campaignRowId: expect.any(String),
      versionId: persisted.versionId,
      contentHash,
      content: {
        text: omnipostXCampaignSeed.contentItems[0].adaptations[0].content,
        mediaUrls: omnipostXCampaignSeed.contentItems[0].adaptations[0].mediaUrls,
        hashtags: omnipostXCampaignSeed.contentItems[0].adaptations[0].hashtags,
        mentions: omnipostXCampaignSeed.contentItems[0].adaptations[0].mentions,
      },
    });
    expect(approvalBinding.campaignRowId).not.toBe(omnipostXCampaignSeed.id);

    await restartedRepository.recordApproval({
      userId: ownerId,
      campaignId: omnipostXCampaignSeed.id,
      version: persisted.version,
      contentId,
      variantId,
      state: 'rejected',
      contentHash,
    });
    await expect(
      restartedRepository.assertApprovedForQueue({
        userId: ownerId,
        campaignId: omnipostXCampaignSeed.id,
        version: persisted.version,
        contentId,
        variantId,
        platformId: 'twitter',
        contentHash,
      })
    ).rejects.toMatchObject({ code: 'CAMPAIGN_APPROVAL_REQUIRED' });

    await restartedRepository.recordApproval({
      userId: ownerId,
      campaignId: omnipostXCampaignSeed.id,
      version: persisted.version,
      contentId,
      variantId,
      state: 'approved',
      contentHash,
    });
    await expect(
      restartedRepository.assertApprovedForQueue({
        userId: ownerId,
        campaignId: omnipostXCampaignSeed.id,
        version: persisted.version,
        contentId,
        variantId,
        platformId: 'twitter',
        contentHash,
      })
    ).resolves.toMatchObject({ versionId: persisted.versionId, contentHash });
  });
});
