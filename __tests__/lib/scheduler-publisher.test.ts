import type { ScheduledJob } from '@/lib/scheduler/types';

const mockReserveRequest = jest.fn();
const mockProviderPublish = jest.fn();
const mockValidateContent = jest.fn();

jest.mock('@/lib/scheduler/rate-limiter', () => ({
  getRateLimiter: () => ({
    canProcess: jest.fn(),
    reserveRequest: mockReserveRequest,
    setBackoff: jest.fn(),
    getRemaining: jest.fn(),
    getStatus: jest.fn(),
  }),
}));

jest.mock('@/lib/scheduler/adapters', () => ({
  getAdapter: () => ({
    validateContent: mockValidateContent,
    publish: mockProviderPublish,
  }),
}));

jest.mock('@/lib/scheduler/retry-handler', () => ({
  getRetryHandler: () => ({ classifyError: jest.fn() }),
}));

import { Publisher } from '@/lib/scheduler/publisher';

const job: ScheduledJob = {
  id: 'publisher-boundary-job',
  idempotencyKey: 'publisher-boundary-key',
  requestFingerprint: 'publisher-boundary-fingerprint',
  type: 'standalone',
  contentId: 'publisher-boundary-content',
  platformId: 'twitter',
  content: { text: 'content' },
  scheduledTime: '2026-07-26T08:00:00.000Z',
  timezone: 'UTC',
  status: 'processing',
  attempts: 0,
  maxAttempts: 5,
  createdAt: '2026-07-26T08:00:00.000Z',
  updatedAt: '2026-07-26T08:00:00.000Z',
};

describe('scheduler publisher request boundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockReserveRequest.mockResolvedValue({ allowed: true, nextAvailableAt: null });
    mockProviderPublish.mockResolvedValue({ id: 'post-1', url: 'https://x.com/post-1' });
  });

  test('does not reserve quota for locally invalid content', async () => {
    mockValidateContent.mockReturnValue({ valid: false, errors: ['too long'], warnings: [] });

    await expect(new Publisher().publish(job)).resolves.toMatchObject({
      success: false,
      error: { code: 'VALIDATION_FAILED' },
    });
    expect(mockReserveRequest).not.toHaveBeenCalled();
    expect(mockProviderPublish).not.toHaveBeenCalled();
  });

  test('marks the attempt immediately before invoking the provider', async () => {
    mockValidateContent.mockReturnValue({ valid: true, errors: [], warnings: [] });
    const order: string[] = [];
    mockProviderPublish.mockImplementation(async () => {
      order.push('provider');
      return { id: 'post-1', url: 'https://x.com/post-1' };
    });

    const result = await new Publisher().publish(job, {
      quotaReserved: true,
      beforeProviderCall: async () => {
        order.push('attempt');
        return true;
      },
    });

    expect(result.success).toBe(true);
    expect(order).toEqual(['attempt', 'provider']);
  });

  test('does not invoke the provider when attempt marking loses the lease', async () => {
    mockValidateContent.mockReturnValue({ valid: true, errors: [], warnings: [] });

    await expect(
      new Publisher().publish(job, {
        quotaReserved: true,
        beforeProviderCall: async () => false,
      })
    ).resolves.toMatchObject({ success: false, error: { code: 'LEASE_LOST' } });
    expect(mockProviderPublish).not.toHaveBeenCalled();
  });
});
