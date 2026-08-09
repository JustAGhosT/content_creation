/** @jest-environment node */

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { PrismaJobQueue } from '@/lib/scheduler/prisma-queue';
import { DurableRateLimiter } from '@/lib/scheduler/rate-limiter';
import { ExternalIdentityEmailConflictError, resolveExternalUser } from '@/lib/auth/external-user';
import type { ScheduledJob } from '@/lib/scheduler/types';

const databaseUrl = process.env.DATABASE_URL;
const describePostgres =
  databaseUrl?.startsWith('postgresql://') || databaseUrl?.startsWith('postgres://')
    ? describe
    : describe.skip;

function testJob(userId: string, suffix: string): ScheduledJob {
  const now = new Date('2026-07-26T08:00:00Z').toISOString();
  return {
    id: `scheduler-job-${suffix}`,
    idempotencyKey: `scheduler-idempotency-${suffix}`,
    requestFingerprint: `scheduler-request-${suffix}`,
    type: 'standalone',
    contentId: `content-${suffix}`,
    platformId: 'twitter',
    content: { text: 'PostgreSQL durable scheduler test' },
    scheduledTime: now,
    timezone: 'UTC',
    status: 'scheduled',
    attempts: 0,
    maxAttempts: 5,
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
  };
}

describePostgres('scheduler persistence, idempotency, and leases', () => {
  const suffix = `${process.pid}-${Date.now()}`;
  const ownerId = `scheduler-owner-${suffix}`;
  const otherOwnerId = `scheduler-other-owner-${suffix}`;
  const campaignId = `scheduler-campaign-${suffix}`;
  const campaignVersionId = `scheduler-campaign-version-${suffix}`;
  let setupClient: PrismaClient | null = null;

  beforeAll(async () => {
    if (!databaseUrl) throw new Error('PostgreSQL DATABASE_URL is required');
    setupClient = new PrismaClient({
      adapter: new PrismaPg({ connectionString: databaseUrl }),
    });
    await setupClient.user.createMany({
      data: [
        {
          id: ownerId,
          username: `scheduler-owner-${suffix}`,
          email: `Scheduler-${suffix}@Example.Test`,
          passwordHash: 'not-a-real-password-hash',
        },
        {
          id: otherOwnerId,
          username: `scheduler-other-owner-${suffix}`,
          email: `scheduler-other-${suffix}@example.test`,
          passwordHash: 'not-a-real-password-hash',
        },
      ],
    });
    await setupClient.campaign.create({
      data: {
        id: campaignId,
        userId: ownerId,
        name: 'Scheduler atomic campaign',
        versions: {
          create: {
            id: campaignVersionId,
            version: 1,
            snapshot: '{}',
            snapshotHash: `sha256:${'b'.repeat(64)}`,
            createdBy: ownerId,
          },
        },
      },
    });
  });

  afterEach(async () => {
    if (setupClient) {
      await setupClient.publishAttempt.deleteMany({ where: { campaignId } });
      await setupClient.schedulerJob.deleteMany({
        where: { userId: { in: [ownerId, otherOwnerId] } },
      });
    }
  });

  afterAll(async () => {
    if (setupClient) {
      await setupClient.user.deleteMany({ where: { id: { in: [ownerId, otherOwnerId] } } });
      await setupClient.$disconnect();
    }
  });

  test('survives a client restart and deduplicates the same request', async () => {
    if (!databaseUrl) throw new Error('PostgreSQL DATABASE_URL is required');
    const firstClient = new PrismaClient({
      adapter: new PrismaPg({ connectionString: databaseUrl }),
    });
    const firstQueue = new PrismaJobQueue(firstClient);
    const original = testJob(ownerId, suffix);
    await expect(firstQueue.add(original)).resolves.toMatchObject({ created: true });
    await firstClient.$disconnect();

    const restartedClient = new PrismaClient({
      adapter: new PrismaPg({ connectionString: databaseUrl }),
    });
    const restartedQueue = new PrismaJobQueue(restartedClient);
    await expect(restartedQueue.get(original.id)).resolves.toMatchObject({
      id: original.id,
      createdBy: ownerId,
      content: original.content,
    });
    await expect(
      restartedQueue.add({ ...original, id: `${original.id}-duplicate` })
    ).resolves.toMatchObject({ created: false, job: { id: original.id } });
    await restartedClient.$disconnect();
  });

  test('persists an external identity before using it as scheduler owner', async () => {
    if (!setupClient) throw new Error('PostgreSQL setup client was not initialized');
    const externalId = `mystira-subject-${suffix}`;
    const email = `mystira-${suffix}@example.test`;
    const resolved = await resolveExternalUser(setupClient, {
      provider: 'mystira',
      externalId,
      email,
      name: 'Mystira Scheduler User',
    });

    try {
      expect(resolved).toMatchObject({ isNew: true, role: 'user' });
      await expect(
        resolveExternalUser(setupClient, {
          provider: 'mystira',
          externalId,
          email,
          name: 'Changed Display Name',
        })
      ).resolves.toMatchObject({ id: resolved.id, isNew: false });
      await expect(
        setupClient.externalIdentity.findUnique({
          where: { provider_externalId: { provider: 'mystira', externalId } },
        })
      ).resolves.toMatchObject({ userId: resolved.id });

      const job = testJob(resolved.id, `${suffix}-external-owner`);
      await expect(new PrismaJobQueue(setupClient).add(job)).resolves.toMatchObject({
        created: true,
        job: { createdBy: resolved.id },
      });
    } finally {
      await setupClient.user.delete({ where: { id: resolved.id } });
    }
  });

  test('does not implicitly link an external identity by email', async () => {
    if (!setupClient) throw new Error('PostgreSQL setup client was not initialized');
    const externalId = `email-collision-${suffix}`;

    await expect(
      resolveExternalUser(setupClient, {
        provider: 'mystira',
        externalId,
        email: `scheduler-${suffix}@example.test`,
        name: 'Conflicting User',
      })
    ).rejects.toBeInstanceOf(ExternalIdentityEmailConflictError);
    await expect(
      setupClient.externalIdentity.findUnique({
        where: { provider_externalId: { provider: 'mystira', externalId } },
      })
    ).resolves.toBeNull();
  });

  test('allows only one database client to claim a due job', async () => {
    if (!databaseUrl) throw new Error('PostgreSQL DATABASE_URL is required');
    const job = testJob(ownerId, `${suffix}-claim`);
    if (!setupClient) throw new Error('PostgreSQL setup client was not initialized');
    await new PrismaJobQueue(setupClient).add(job);

    const firstClient = new PrismaClient({
      adapter: new PrismaPg({ connectionString: databaseUrl }),
    });
    const secondClient = new PrismaClient({
      adapter: new PrismaPg({ connectionString: databaseUrl }),
    });
    const dueAt = new Date('2026-07-26T08:00:00Z');
    const [first, second] = await Promise.all([
      new PrismaJobQueue(firstClient).claimDueJobs(
        dueAt,
        1,
        'database-lease-a',
        new Date('2026-07-26T08:02:00Z')
      ),
      new PrismaJobQueue(secondClient).claimDueJobs(
        dueAt,
        1,
        'database-lease-b',
        new Date('2026-07-26T08:02:00Z')
      ),
    ]);

    expect([...first, ...second]).toHaveLength(1);
    const claimed = [...first, ...second][0];
    expect(claimed).toMatchObject({ status: 'processing', attempts: 0 });
    const claimingQueue =
      claimed.leaseToken === 'database-lease-a'
        ? new PrismaJobQueue(firstClient)
        : new PrismaJobQueue(secondClient);
    await expect(
      claimingQueue.markClaimAttempt(claimed.id, claimed.leaseToken!, dueAt)
    ).resolves.toMatchObject({ attempts: 1, lastAttemptAt: dueAt.toISOString() });
    await firstClient.$disconnect();
    await secondClient.$disconnect();
  });

  test('atomically reserves shared platform quota across database clients', async () => {
    if (!databaseUrl) throw new Error('PostgreSQL DATABASE_URL is required');
    const platformId = `quota-${suffix}`;
    const firstClient = new PrismaClient({
      adapter: new PrismaPg({ connectionString: databaseUrl }),
    });
    const secondClient = new PrismaClient({
      adapter: new PrismaPg({ connectionString: databaseUrl }),
    });
    const config = { [platformId]: { requests: 1, window: 900 } };

    const reservations = await Promise.all([
      new DurableRateLimiter(firstClient, config).reserveRequest(platformId),
      new DurableRateLimiter(secondClient, config).reserveRequest(platformId),
    ]);

    expect(reservations.filter(reservation => reservation.allowed)).toHaveLength(1);
    expect(reservations.filter(reservation => !reservation.allowed)).toEqual([
      expect.objectContaining({ nextAvailableAt: expect.any(Date) }),
    ]);
    const rows = await firstClient.$queryRaw<Array<{ requestCount: number }>>`
      SELECT "requestCount" FROM "SchedulerPlatformQuota" WHERE "platformId" = ${platformId}
    `;
    expect(rows).toEqual([{ requestCount: 1 }]);
    await firstClient.$executeRaw`
      DELETE FROM "SchedulerPlatformQuota" WHERE "platformId" = ${platformId}
    `;
    await firstClient.$disconnect();
    await secondClient.$disconnect();
  });

  test('reclaims pre-attempt expiry but quarantines an unknown provider result', async () => {
    if (!setupClient) throw new Error('PostgreSQL setup client was not initialized');
    const queue = new PrismaJobQueue(setupClient);
    const beforeAttempt = testJob(ownerId, `${suffix}-before-attempt`);
    const afterAttempt = testJob(ownerId, `${suffix}-after-attempt`);
    await queue.add({
      ...beforeAttempt,
      status: 'processing',
      leaseToken: 'expired-before-attempt',
      leaseExpiresAt: '2026-07-26T07:59:00.000Z',
    });
    await queue.add({
      ...afterAttempt,
      status: 'processing',
      attempts: 1,
      leaseToken: 'expired-after-attempt',
      leaseExpiresAt: '2026-07-26T07:59:00.000Z',
      attemptStartedAt: '2026-07-26T07:58:00.000Z',
    });

    await expect(
      queue.claimDueJobs(
        new Date('2026-07-26T08:00:00Z'),
        1,
        'recovery-lease',
        new Date('2026-07-26T08:02:00Z')
      )
    ).resolves.toEqual([
      expect.objectContaining({ id: beforeAttempt.id, leaseToken: 'recovery-lease' }),
    ]);
    await expect(queue.get(afterAttempt.id, ownerId)).resolves.toMatchObject({
      status: 'reconciliation_required',
      leaseToken: undefined,
    });
  });

  test('does not expose jobs across tenants', async () => {
    if (!setupClient) throw new Error('PostgreSQL setup client was not initialized');
    const queue = new PrismaJobQueue(setupClient);
    const otherJob = testJob(otherOwnerId, `${suffix}-other-owner`);
    await queue.add(otherJob);

    await expect(queue.get(otherJob.id, ownerId)).resolves.toBeNull();
    await expect(queue.getAll(ownerId)).resolves.not.toContainEqual(
      expect.objectContaining({ id: otherJob.id })
    );
    await expect(queue.getAll(otherOwnerId)).resolves.toEqual([
      expect.objectContaining({ id: otherJob.id, createdBy: otherOwnerId }),
    ]);
  });

  test('paginates tenant job history in PostgreSQL with an independent total', async () => {
    if (!setupClient) throw new Error('PostgreSQL setup client was not initialized');
    const queue = new PrismaJobQueue(setupClient);
    const first = testJob(ownerId, `${suffix}-page-a`);
    const second = testJob(ownerId, `${suffix}-page-b`);
    await queue.add(first);
    await queue.add(second);

    await expect(
      queue.list({ userId: ownerId, status: 'scheduled', limit: 1, offset: 1 })
    ).resolves.toEqual({
      jobs: [expect.objectContaining({ id: second.id })],
      total: 2,
    });
  });

  test('creates a campaign job and its audit attempt atomically and idempotently', async () => {
    if (!setupClient) throw new Error('PostgreSQL setup client was not initialized');
    const queue = new PrismaJobQueue(setupClient);
    const campaignJob = testJob(ownerId, `${suffix}-campaign`);
    Object.assign(campaignJob, {
      type: 'campaign_post',
      campaignId: `external-${campaignId}`,
      campaignVersion: 1,
      campaignVersionId,
      approvedContentHash: `sha256:${'c'.repeat(64)}`,
      variantId: 'variant-1',
    });
    const audit = {
      campaignId,
      campaignVersionId,
      contentId: campaignJob.contentId,
      variantId: 'variant-1',
      platformId: campaignJob.platformId,
      contentHash: campaignJob.approvedContentHash!,
      requestedBy: ownerId,
    };

    await expect(queue.addCampaignJob(campaignJob, audit)).resolves.toMatchObject({
      created: true,
    });
    await expect(
      queue.addCampaignJob({ ...campaignJob, id: `${campaignJob.id}-replay` }, audit)
    ).resolves.toMatchObject({ created: false, job: { id: campaignJob.id } });
    await expect(
      setupClient.publishAttempt.count({ where: { schedulerJobId: campaignJob.id } })
    ).resolves.toBe(1);
    await expect(
      setupClient.analyticsEventRecord.count({
        where: { eventId: `scheduler:${campaignJob.id}:queued` },
      })
    ).resolves.toBe(1);

    const invalidJob = {
      ...campaignJob,
      id: `${campaignJob.id}-invalid`,
      idempotencyKey: `${campaignJob.idempotencyKey}-invalid`,
      requestFingerprint: `${campaignJob.requestFingerprint}-invalid`,
      campaignVersionId: 'missing-campaign-version',
    };
    await expect(
      queue.addCampaignJob(invalidJob, {
        ...audit,
        campaignVersionId: 'missing-campaign-version',
      })
    ).rejects.toBeDefined();
    await expect(queue.get(invalidJob.id, ownerId)).resolves.toBeNull();
  });

  test('preserves scheduler history when its campaign is deleted', async () => {
    if (!setupClient) throw new Error('PostgreSQL setup client was not initialized');
    const deleteCampaignId = `${campaignId}-delete`;
    const deleteVersionId = `${campaignVersionId}-delete`;
    await setupClient.campaign.create({
      data: {
        id: deleteCampaignId,
        userId: ownerId,
        name: 'Deletable scheduler campaign',
        versions: {
          create: {
            id: deleteVersionId,
            version: 1,
            snapshot: '{}',
            snapshotHash: `sha256:${'d'.repeat(64)}`,
            createdBy: ownerId,
          },
        },
      },
    });
    const queue = new PrismaJobQueue(setupClient);
    const scheduled = testJob(ownerId, `${suffix}-campaign-delete`);
    scheduled.campaignId = deleteCampaignId;
    scheduled.campaignVersionId = deleteVersionId;
    await queue.add(scheduled);

    await setupClient.campaign.delete({ where: { id: deleteCampaignId } });

    await expect(queue.get(scheduled.id, ownerId)).resolves.toMatchObject({
      campaignId: deleteCampaignId,
      campaignVersionId: undefined,
    });
  });
});
