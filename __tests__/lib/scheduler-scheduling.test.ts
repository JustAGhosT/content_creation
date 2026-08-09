/** @jest-environment node */

import type { PrismaClient } from '@prisma/client';
import { PrismaJobQueue, SchedulerQueueError } from '@/lib/scheduler/prisma-queue';
import type { JobQueue, ScheduleJobResult } from '@/lib/scheduler/types';

jest.mock('@/lib/scheduler/queue', () => ({
  generateJobId: jest.fn(),
  getQueue: jest.fn(),
}));
jest.mock('@/lib/scheduler/rate-limiter', () => ({ getRateLimiter: jest.fn() }));
jest.mock('@/lib/scheduler/retry-handler', () => ({ getRetryHandler: jest.fn() }));
jest.mock('@/lib/scheduler/publisher', () => ({ getPublisher: jest.fn() }));

import { generateJobId, getQueue } from '@/lib/scheduler/queue';
import { getPublisher } from '@/lib/scheduler/publisher';
import { getRateLimiter } from '@/lib/scheduler/rate-limiter';
import { getRetryHandler } from '@/lib/scheduler/retry-handler';
import { Scheduler } from '@/lib/scheduler/scheduler';

describe('scheduler request idempotency', () => {
  const add = jest.fn(async job => ({ job, created: true }));

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getQueue).mockReturnValue({ add } as unknown as JobQueue);
    jest.mocked(getRateLimiter).mockReturnValue({} as ReturnType<typeof getRateLimiter>);
    jest.mocked(getRetryHandler).mockReturnValue({} as ReturnType<typeof getRetryHandler>);
    jest.mocked(getPublisher).mockReturnValue({
      validate: () => ({ valid: true, errors: [] }),
    } as unknown as ReturnType<typeof getPublisher>);
  });

  const input = {
    type: 'standalone' as const,
    contentId: 'content-1',
    platformId: 'twitter',
    content: { text: 'Publish this again intentionally' },
    scheduledTime: '2026-07-26T14:00:00.000Z',
    timezone: 'UTC',
    createdBy: 'user-1',
  };

  test('creates a unique server key for each request that omits one', async () => {
    jest.mocked(generateJobId).mockReturnValueOnce('job-1').mockReturnValueOnce('job-2');
    const scheduler = new Scheduler();

    const first = await scheduler.scheduleWithResult(input);
    const second = await scheduler.scheduleWithResult(input);

    expect(first.job.idempotencyKey).toBe('scheduler:v1:job-1');
    expect(second.job.idempotencyKey).toBe('scheduler:v1:job-2');
    expect(first.job.requestFingerprint).toBe(second.job.requestFingerprint);
  });

  test('preserves a caller-supplied key for durable replay', async () => {
    jest.mocked(generateJobId).mockReturnValue('job-with-client-key');
    const scheduler = new Scheduler();

    const result = await scheduler.scheduleWithResult({
      ...input,
      idempotencyKey: 'client-request-key',
    });

    expect(result.job.idempotencyKey).toBe('client-request-key');
  });

  test('returns a matching durable replay before mutable campaign validation', async () => {
    const durableQueue = new PrismaJobQueue({} as PrismaClient);
    jest.mocked(getQueue).mockReturnValue(durableQueue);
    jest.mocked(generateJobId).mockReturnValue('campaign-job');
    jest.spyOn(durableQueue, 'add').mockImplementation(async job => ({ job, created: true }));
    const scheduler = new Scheduler();
    const campaignInput = {
      ...input,
      type: 'campaign_post' as const,
      campaignId: 'campaign-1',
      campaignVersion: 1,
      campaignVersionId: 'version-row-1',
      approvedContentHash: `sha256:${'a'.repeat(64)}`,
      variantId: 'variant-1',
      content: { text: 'Canonical approved content' },
      idempotencyContent: { text: 'Original client content' },
      idempotencyKey: 'campaign-request-key',
    };
    const created = await scheduler.scheduleWithResult(campaignInput);
    jest.spyOn(durableQueue, 'getByIdempotencyKey').mockResolvedValue(created.job);

    await expect(
      scheduler.findIdempotentReplay({
        ...campaignInput,
        campaignVersionId: undefined,
        content: campaignInput.idempotencyContent,
      })
    ).resolves.toEqual({ job: created.job, created: false });
    await expect(
      scheduler.findIdempotentReplay({
        ...campaignInput,
        campaignVersionId: undefined,
        content: { text: 'Different request' },
        idempotencyContent: { text: 'Different request' },
      })
    ).rejects.toBeInstanceOf(SchedulerQueueError);
  });

  test('starts lease renewal only after the provider attempt is marked', async () => {
    const order: string[] = [];
    jest.mocked(getPublisher).mockReturnValue({
      validate: () => ({ valid: true, errors: [] }),
      publish: async (
        _job: ScheduleJobResult['job'],
        options: { quotaReserved?: boolean; beforeProviderCall?: () => Promise<boolean> }
      ) => {
        order.push('publisher-ready');
        const proceed = await options?.beforeProviderCall?.();
        if (!proceed) throw new Error('attempt was not marked');
        order.push('provider');
        return { success: true, result: { id: 'post-1' } };
      },
    } as unknown as ReturnType<typeof getPublisher>);
    const scheduler = new Scheduler();
    Object.assign(scheduler, {
      startLeaseHeartbeat: () => {
        order.push('heartbeat');
        return async () => undefined;
      },
    });
    const publishWithLeaseHeartbeat = (
      scheduler as unknown as {
        publishWithLeaseHeartbeat: (
          job: ScheduleJobResult['job'],
          leaseToken: string,
          beforeProviderCall: () => Promise<boolean>
        ) => Promise<unknown>;
      }
    ).publishWithLeaseHeartbeat.bind(scheduler);

    await publishWithLeaseHeartbeat(
      {
        ...(await scheduler.scheduleWithResult({ ...input, idempotencyKey: 'heartbeat-key' })).job,
        leaseToken: 'lease-1',
      },
      'lease-1',
      async () => {
        order.push('mark-start');
        await Promise.resolve();
        order.push('mark-complete');
        return true;
      }
    );

    expect(order).toEqual([
      'publisher-ready',
      'mark-start',
      'mark-complete',
      'heartbeat',
      'provider',
    ]);
  });

  test('keeps prior provider evidence when a manual retry is queued', async () => {
    const failedJob = {
      ...(await new Scheduler().scheduleWithResult(input)).job,
      status: 'dead' as const,
      errorCode: 'PAYMENT_REQUIRED',
      error: 'Provider credits or billing required',
      lastAttemptAt: '2026-07-26T14:01:00.000Z',
    };
    const updateIfStatus = jest.fn().mockResolvedValue(true);
    const get = jest.fn().mockResolvedValue(failedJob);
    jest.mocked(getQueue).mockReturnValue({ get, updateIfStatus } as unknown as JobQueue);

    await expect(new Scheduler().retry(failedJob.id, failedJob.createdBy)).resolves.toEqual(
      failedJob
    );
    expect(updateIfStatus).toHaveBeenCalledWith(
      failedJob.id,
      ['failed', 'dead'],
      expect.any(Object),
      failedJob.createdBy
    );
    const updates = updateIfStatus.mock.calls[0][2];
    expect(updates).not.toHaveProperty('errorCode');
    expect(updates).not.toHaveProperty('error');
  });

  test('timestamps a successful outcome after the provider returns', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-09T12:00:00.000Z'));
    const updateClaimed = jest.fn().mockResolvedValue(true);
    const scheduledJob: ScheduleJobResult['job'] = {
      id: 'outcome-time-job',
      idempotencyKey: 'outcome-time-key',
      requestFingerprint: 'outcome-time-fingerprint',
      type: 'standalone',
      contentId: 'content-1',
      platformId: 'twitter',
      content: { text: 'Provider-timed post' },
      scheduledTime: '2026-08-09T12:00:00.000Z',
      timezone: 'UTC',
      status: 'processing',
      attempts: 0,
      maxAttempts: 5,
      createdAt: '2026-08-09T11:00:00.000Z',
      updatedAt: '2026-08-09T12:00:00.000Z',
      createdBy: 'user-1',
    };
    const markClaimAttempt = jest.fn().mockImplementation(async (_id, _lease, attemptedAt) => ({
      ...scheduledJob,
      attempts: 1,
      lastAttemptAt: attemptedAt.toISOString(),
    }));
    jest
      .mocked(getQueue)
      .mockReturnValue({ updateClaimed, markClaimAttempt } as unknown as JobQueue);
    jest.mocked(getPublisher).mockReturnValue({
      publish: async (
        _job: ScheduleJobResult['job'],
        options: { beforeProviderCall?: () => Promise<boolean> }
      ) => {
        await options.beforeProviderCall?.();
        jest.setSystemTime(new Date('2026-08-09T12:00:02.000Z'));
        return { success: true, result: { id: 'post-1', url: 'https://x.com/post-1' } };
      },
    } as unknown as ReturnType<typeof getPublisher>);
    const scheduler = new Scheduler();
    Object.assign(scheduler, { startLeaseHeartbeat: () => async () => undefined });

    await (
      scheduler as unknown as {
        processJob: (job: ScheduleJobResult['job'], lease: string) => Promise<unknown>;
      }
    ).processJob(scheduledJob, 'lease-1');

    expect(updateClaimed).toHaveBeenCalledWith(
      'outcome-time-job',
      'lease-1',
      expect.objectContaining({
        publishedAt: '2026-08-09T12:00:02.000Z',
        updatedAt: '2026-08-09T12:00:02.000Z',
      })
    );
    jest.useRealTimers();
  });
});
