import { ServerMemoryQueue } from '@/lib/scheduler/queue';
import type { ScheduledJob } from '@/lib/scheduler/types';

function job(overrides: Partial<ScheduledJob> = {}): ScheduledJob {
  const now = new Date('2026-07-26T08:00:00Z').toISOString();
  return {
    id: 'job-1',
    idempotencyKey: 'publish:user-1:content-1:twitter',
    type: 'standalone',
    contentId: 'content-1',
    platformId: 'twitter',
    content: { text: 'Durable scheduler test' },
    scheduledTime: now,
    timezone: 'UTC',
    status: 'scheduled',
    attempts: 0,
    maxAttempts: 5,
    createdAt: now,
    updatedAt: now,
    createdBy: 'user-1',
    ...overrides,
  };
}

describe('durable scheduler queue contract', () => {
  test('deduplicates identical requests and rejects key reuse for different content', async () => {
    const queue = new ServerMemoryQueue();
    const first = await queue.add(job());
    const duplicate = await queue.add(job({ id: 'job-2' }));

    expect(first.created).toBe(true);
    expect(duplicate).toEqual({ job: first.job, created: false });
    await expect(
      queue.add(job({ id: 'job-3', content: { text: 'Different content' } }))
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
    await expect(
      queue.add(job({ id: 'job-4', approvedContentHash: `sha256:${'a'.repeat(64)}` }))
    ).rejects.toMatchObject({ code: 'IDEMPOTENCY_CONFLICT' });
    await expect(queue.count()).resolves.toBe(1);
  });

  test('allows only one concurrent processor to claim a due job', async () => {
    const queue = new ServerMemoryQueue();
    const dueAt = new Date('2026-07-26T08:00:00Z');
    await queue.add(job());

    const [first, second] = await Promise.all([
      queue.claimDueJobs(dueAt, 1, 'lease-a', new Date('2026-07-26T08:02:00Z')),
      queue.claimDueJobs(dueAt, 1, 'lease-b', new Date('2026-07-26T08:02:00Z')),
    ]);

    expect([...first, ...second]).toHaveLength(1);
    expect([...first, ...second][0]).toMatchObject({ status: 'processing', attempts: 1 });
  });

  test('requires the active lease token to complete a claim', async () => {
    const queue = new ServerMemoryQueue();
    const dueAt = new Date('2026-07-26T08:00:00Z');
    await queue.add(job());
    await queue.claimDueJobs(dueAt, 1, 'lease-a', new Date('2026-07-26T08:02:00Z'));

    await expect(
      queue.updateClaimed('job-1', 'lease-b', {
        status: 'published',
        publishedAt: dueAt.toISOString(),
      })
    ).resolves.toBe(false);
    await expect(
      queue.updateClaimed('job-1', 'lease-a', {
        status: 'published',
        publishedAt: dueAt.toISOString(),
      })
    ).resolves.toBe(true);
    await expect(queue.get('job-1')).resolves.toMatchObject({
      status: 'published',
      leaseToken: undefined,
      leaseExpiresAt: undefined,
    });
  });

  test('quarantines an abandoned processing lease instead of republishing it', async () => {
    const queue = new ServerMemoryQueue();
    await queue.add(
      job({
        status: 'processing',
        attempts: 1,
        leaseToken: 'abandoned-lease',
        leaseExpiresAt: '2026-07-26T07:59:00.000Z',
      })
    );

    const claimed = await queue.claimDueJobs(
      new Date('2026-07-26T08:00:00Z'),
      1,
      'new-lease',
      new Date('2026-07-26T08:02:00Z')
    );

    expect(claimed).toEqual([]);
    await expect(queue.get('job-1')).resolves.toMatchObject({
      status: 'reconciliation_required',
      attempts: 1,
    });
  });

  test('keeps reads tenant-scoped', async () => {
    const queue = new ServerMemoryQueue();
    await queue.add(job({ campaignId: 'campaign-1' }));
    await queue.add(
      job({
        id: 'job-2',
        idempotencyKey: 'publish:user-2:content-2:twitter',
        contentId: 'content-2',
        campaignId: 'campaign-1',
        createdBy: 'user-2',
      })
    );

    await expect(queue.get('job-2', 'user-1')).resolves.toBeNull();
    await expect(queue.getAll('user-1')).resolves.toEqual([
      expect.objectContaining({ id: 'job-1', createdBy: 'user-1' }),
    ]);
    await expect(queue.getByStatus('scheduled', 10, 'user-1')).resolves.toHaveLength(1);
    await expect(queue.getByCampaign('campaign-1', 'user-1')).resolves.toHaveLength(1);
  });
});
