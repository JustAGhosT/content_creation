/**
 * Rate Limiter Service
 * Tracks and enforces rate limits per platform
 */

import { PlatformRateLimit, RateLimitConfig, RATE_LIMITS } from './types';

const STORAGE_KEY = 'scheduler-rate-limits';

/**
 * Load rate limits from storage
 */
function loadFromStorage(): Map<string, PlatformRateLimit> {
  if (globalThis.window === undefined) {
    return new Map();
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const limits: PlatformRateLimit[] = JSON.parse(stored);
      return new Map(limits.map(limit => [limit.platformId, limit]));
    }
  } catch (error) {
    console.error('Error loading rate limits:', error);
  }
  return new Map();
}

/**
 * Save rate limits to storage
 */
function saveToStorage(limits: Map<string, PlatformRateLimit>): void {
  if (globalThis.window === undefined) {
    return;
  }
  try {
    const limitArray = Array.from(limits.values());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(limitArray));
  } catch (error) {
    console.error('Error saving rate limits:', error);
  }
}

/**
 * Rate Limiter
 * Manages rate limiting for all platforms
 */
export class RateLimiter {
  private limits: Map<string, PlatformRateLimit>;
  private readonly configs: Record<string, RateLimitConfig>;
  private initialized: boolean = false;

  constructor(configs: Record<string, RateLimitConfig> = RATE_LIMITS) {
    this.limits = new Map();
    this.configs = configs;
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      this.limits = loadFromStorage();
      this.initialized = true;
    }
  }

  private persist(): void {
    saveToStorage(this.limits);
  }

  /**
   * Get or create rate limit state for a platform
   */
  private getOrCreateLimit(platformId: string): PlatformRateLimit {
    this.ensureInitialized();

    let limit = this.limits.get(platformId);
    if (!limit) {
      const config = this.configs[platformId] || { requests: 100, window: 3600 };
      limit = {
        platformId,
        windowStart: new Date().toISOString(),
        windowDuration: config.window,
        requestCount: 0,
        requestLimit: config.requests,
        dailyCount: config.daily ? 0 : undefined,
        dailyLimit: config.daily,
        dailyResetAt: config.daily ? this.getNextDailyReset().toISOString() : undefined,
        isBackingOff: false,
      };
      this.limits.set(platformId, limit);
    }

    return limit;
  }

  /**
   * Get next daily reset time (midnight UTC)
   */
  private getNextDailyReset(): Date {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(0, 0, 0, 0);
    return tomorrow;
  }

  /**
   * Check if window needs to be reset
   */
  private checkWindowReset(limit: PlatformRateLimit): void {
    const now = new Date();
    const windowStart = new Date(limit.windowStart);
    const windowEnd = new Date(windowStart.getTime() + limit.windowDuration * 1000);

    if (now >= windowEnd) {
      // Reset window
      limit.windowStart = now.toISOString();
      limit.requestCount = 0;
    }

    // Check daily reset
    if (limit.dailyResetAt && now >= new Date(limit.dailyResetAt)) {
      limit.dailyCount = 0;
      limit.dailyResetAt = this.getNextDailyReset().toISOString();
    }

    // Check backoff expiry
    if (limit.isBackingOff && limit.backoffUntil && now >= new Date(limit.backoffUntil)) {
      limit.isBackingOff = false;
      limit.backoffUntil = undefined;
    }
  }

  /**
   * Check if a request can be made for the platform
   */
  async canProcess(platformId: string): Promise<boolean> {
    const limit = this.getOrCreateLimit(platformId);
    this.checkWindowReset(limit);

    // Check if backing off
    if (limit.isBackingOff) {
      return false;
    }

    // Check window limit
    if (limit.requestCount >= limit.requestLimit) {
      return false;
    }

    // Check daily limit
    if (
      limit.dailyLimit &&
      limit.dailyCount !== undefined &&
      limit.dailyCount >= limit.dailyLimit
    ) {
      return false;
    }

    return true;
  }

  /** Earliest time all active local quota/backoff constraints have reset. */
  async getNextAvailableAt(platformId: string): Promise<Date | null> {
    const limit = this.getOrCreateLimit(platformId);
    this.checkWindowReset(limit);
    const resetTimes: number[] = [];

    if (limit.isBackingOff && limit.backoffUntil) {
      resetTimes.push(new Date(limit.backoffUntil).getTime());
    }
    if (limit.requestCount >= limit.requestLimit) {
      resetTimes.push(new Date(limit.windowStart).getTime() + limit.windowDuration * 1000);
    }
    if (
      limit.dailyLimit &&
      limit.dailyCount !== undefined &&
      limit.dailyCount >= limit.dailyLimit &&
      limit.dailyResetAt
    ) {
      resetTimes.push(new Date(limit.dailyResetAt).getTime());
    }

    return resetTimes.length > 0 ? new Date(Math.max(...resetTimes)) : null;
  }

  /**
   * Record a request for rate limiting
   */
  async recordRequest(platformId: string): Promise<void> {
    const limit = this.getOrCreateLimit(platformId);
    this.checkWindowReset(limit);

    limit.requestCount++;
    if (limit.dailyCount !== undefined) {
      limit.dailyCount++;
    }

    this.persist();
  }

  /**
   * Set backoff for a platform (e.g., after rate limit error)
   */
  async setBackoff(platformId: string, durationSeconds: number): Promise<void> {
    const limit = this.getOrCreateLimit(platformId);
    limit.isBackingOff = true;
    limit.backoffUntil = new Date(Date.now() + durationSeconds * 1000).toISOString();
    this.persist();
  }

  /**
   * Get remaining requests for a platform
   */
  async getRemaining(platformId: string): Promise<{ window: number; daily?: number }> {
    const limit = this.getOrCreateLimit(platformId);
    this.checkWindowReset(limit);

    return {
      window: Math.max(0, limit.requestLimit - limit.requestCount),
      daily: limit.dailyLimit ? Math.max(0, limit.dailyLimit - (limit.dailyCount || 0)) : undefined,
    };
  }

  /**
   * Get rate limit status for all platforms
   */
  async getStatus(): Promise<
    Record<
      string,
      {
        remaining: number;
        resetAt: string;
        isBackingOff: boolean;
      }
    >
  > {
    this.ensureInitialized();
    const status: Record<
      string,
      {
        remaining: number;
        resetAt: string;
        isBackingOff: boolean;
      }
    > = {};

    for (const platformId of Object.keys(this.configs)) {
      const limit = this.getOrCreateLimit(platformId);
      this.checkWindowReset(limit);

      const windowReset = new Date(
        new Date(limit.windowStart).getTime() + limit.windowDuration * 1000
      );

      status[platformId] = {
        remaining: Math.max(0, limit.requestLimit - limit.requestCount),
        resetAt: windowReset.toISOString(),
        isBackingOff: limit.isBackingOff,
      };
    }

    return status;
  }

  /**
   * Reset rate limits for a platform
   */
  async reset(platformId: string): Promise<void> {
    this.limits.delete(platformId);
    this.persist();
  }

  /**
   * Reset all rate limits
   */
  async resetAll(): Promise<void> {
    this.limits.clear();
    this.persist();
  }
}

// Singleton instance
let rateLimiter: RateLimiter | null = null;

/**
 * Get the rate limiter instance
 */
export function getRateLimiter(): RateLimiter {
  rateLimiter ??= new RateLimiter();
  return rateLimiter;
}
