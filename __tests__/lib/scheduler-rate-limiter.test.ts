import { RateLimiter } from '@/lib/scheduler/rate-limiter';

describe('scheduler rate-limit deferral', () => {
  test('reports the latest reset without consuming another request', async () => {
    const limiter = new RateLimiter({
      twitter: { requests: 1, window: 900, daily: 1 },
    });
    await limiter.recordRequest('twitter');

    await expect(limiter.canProcess('twitter')).resolves.toBe(false);
    const nextAvailableAt = await limiter.getNextAvailableAt('twitter');

    expect(nextAvailableAt).not.toBeNull();
    expect(nextAvailableAt!.getTime()).toBeGreaterThan(Date.now());
    await expect(limiter.getRemaining('twitter')).resolves.toEqual({ window: 0, daily: 0 });
  });
});
