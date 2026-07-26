/** @jest-environment node */

import type { JobQueue } from '@/lib/scheduler/types';

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
});
