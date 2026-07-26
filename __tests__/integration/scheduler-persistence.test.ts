/** @jest-environment node */

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { PrismaJobQueue } from '@/lib/scheduler/prisma-queue';
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
          email: `scheduler-${suffix}@example.test`,
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
  });

  afterEach(async () => {
    if (setupClient) {
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
});
