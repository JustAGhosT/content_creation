/** @jest-environment node */

import { readFileSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaClient } from '@prisma/client';
import { omnipostXCampaignSeed } from '@/lib/seed/omnipost-x-campaign';

function migrationStatements(file: string): string[] {
  return readFileSync(file, 'utf8')
    .split(';')
    .map(statement => statement.trim())
    .filter(Boolean);
}

describe('campaign persistence restart behavior', () => {
  const databaseFile = path.join(os.tmpdir(), `omnipost-campaign-${process.pid}-${Date.now()}.db`);
  const databaseUrl = `file:${databaseFile.replaceAll('\\', '/')}`;
  const previousDatabaseUrl = process.env.DATABASE_URL;

  afterAll(async () => {
    const globalPrisma = globalThis as unknown as {
      prisma?: PrismaClient;
    };
    await globalPrisma.prisma?.$disconnect();
    globalPrisma.prisma = undefined;
    if (previousDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = previousDatabaseUrl;
    }
    rmSync(databaseFile, { force: true });
  });

  test('survives a client restart with immutable approval history', async () => {
    const setupClient = new PrismaClient({
      adapter: new PrismaBetterSqlite3({ url: databaseUrl }),
    });
    const migrations = [
      path.join(
        process.cwd(),
        'prisma',
        'migrations',
        '20260403182739_add_video_job_model',
        'migration.sql'
      ),
      path.join(
        process.cwd(),
        'prisma',
        'migrations',
        '20260724234420_campaign_persistence',
        'migration.sql'
      ),
    ];
    for (const migration of migrations) {
      for (const statement of migrationStatements(migration)) {
        await setupClient.$executeRawUnsafe(statement);
      }
    }
    await setupClient.$executeRawUnsafe(
      `INSERT INTO "User" ("id", "username", "email", "passwordHash", "role", "createdAt", "updatedAt")
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
              (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      'user-1',
      'campaign-owner',
      'owner@example.test',
      'not-a-real-password-hash',
      'user',
      'user-2',
      'second-owner',
      'second@example.test',
      'not-a-real-password-hash',
      'user'
    );
    await setupClient.$disconnect();

    process.env.DATABASE_URL = databaseUrl;
    jest.resetModules();
    const repository = await import('@/lib/campaigns/repository');
    const persisted = await repository.saveCampaignVersion({
      userId: 'user-1',
      campaign: omnipostXCampaignSeed,
      source: 'git-import',
    });
    const contentId = omnipostXCampaignSeed.contentItems[0].id;
    const variantId = omnipostXCampaignSeed.contentItems[0].adaptations[0].variantId;
    const contentHash = persisted.contentHashes[contentId];
    await repository.recordApproval({
      userId: 'user-1',
      campaignId: omnipostXCampaignSeed.id,
      version: persisted.version,
      contentId,
      variantId,
      state: 'approved',
      contentHash,
    });
    const secondTenant = await repository.saveCampaignVersion({
      userId: 'user-2',
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
      userId: 'user-1',
      campaignId: omnipostXCampaignSeed.id,
      version: persisted.version,
      links: [attribution],
    });
    await repository.recordAttributionLinks({
      userId: 'user-2',
      campaignId: omnipostXCampaignSeed.id,
      version: secondTenant.version,
      links: [attribution],
    });

    const globalPrisma = globalThis as unknown as {
      prisma?: PrismaClient;
    };
    await globalPrisma.prisma?.$disconnect();
    globalPrisma.prisma = undefined;
    jest.resetModules();

    const restartedRepository = await import('@/lib/campaigns/repository');
    const afterRestart = await restartedRepository.getCampaign('user-1', omnipostXCampaignSeed.id);
    const approvalBinding = await restartedRepository.assertApprovedForQueue({
      userId: 'user-1',
      campaignId: omnipostXCampaignSeed.id,
      version: afterRestart.version,
      contentId,
      variantId,
      contentHash,
    });

    expect(afterRestart.snapshotHash).toBe(persisted.snapshotHash);
    expect(approvalBinding).toEqual({
      versionId: persisted.versionId,
      contentHash,
    });
  });
});
