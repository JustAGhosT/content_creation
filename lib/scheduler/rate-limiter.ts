/**
 * Rate Limiter Service
 * Tracks and enforces rate limits per platform
 */

import type { Prisma, PrismaClient } from '@prisma/client';
import prisma from '@/lib/db/prisma';
import { PlatformRateLimit, RateLimitConfig, RATE_LIMITS } from './types';

export interface RateLimitReservation {
  allowed: boolean;
  nextAvailableAt: Date | null;
}

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

  /** Atomically reserve capacity before a provider request starts. */
  async reserveRequest(platformId: string): Promise<RateLimitReservation> {
    if (!(await this.canProcess(platformId))) {
      return {
        allowed: false,
        nextAvailableAt: await this.getNextAvailableAt(platformId),
      };
    }
    await this.recordRequest(platformId);
    return { allowed: true, nextAvailableAt: null };
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

interface StoredQuota {
  platformId: string;
  windowStart: Date;
  windowDuration: number;
  requestCount: number;
  requestLimit: number;
  dailyCount: number | null;
  dailyLimit: number | null;
  dailyResetAt: Date | null;
  backoffUntil: Date | null;
}

type QuotaState = StoredQuota;

/** PostgreSQL-backed quota reservations shared by every scheduler worker. */
export class DurableRateLimiter extends RateLimiter {
  constructor(
    private readonly client: PrismaClient,
    private readonly durableConfigs: Record<string, RateLimitConfig> = RATE_LIMITS
  ) {
    super(durableConfigs);
  }

  private configFor(platformId: string): RateLimitConfig {
    return this.durableConfigs[platformId] || { requests: 100, window: 3600 };
  }

  private nextDailyReset(now: Date): Date {
    const reset = new Date(now);
    reset.setUTCDate(reset.getUTCDate() + 1);
    reset.setUTCHours(0, 0, 0, 0);
    return reset;
  }

  private normalize(platformId: string, stored: StoredQuota | null, now: Date): QuotaState {
    const config = this.configFor(platformId);
    const state: QuotaState = stored
      ? {
          platformId: stored.platformId,
          windowStart: stored.windowStart,
          windowDuration: config.window,
          requestCount: stored.requestCount,
          requestLimit: config.requests,
          dailyCount: config.daily ? (stored.dailyCount ?? 0) : null,
          dailyLimit: config.daily ?? null,
          dailyResetAt: config.daily ? (stored.dailyResetAt ?? this.nextDailyReset(now)) : null,
          backoffUntil: stored.backoffUntil,
        }
      : {
          platformId,
          windowStart: now,
          windowDuration: config.window,
          requestCount: 0,
          requestLimit: config.requests,
          dailyCount: config.daily ? 0 : null,
          dailyLimit: config.daily ?? null,
          dailyResetAt: config.daily ? this.nextDailyReset(now) : null,
          backoffUntil: null,
        };

    if (now.getTime() >= state.windowStart.getTime() + state.windowDuration * 1000) {
      state.windowStart = now;
      state.requestCount = 0;
    }
    if (state.dailyResetAt && now >= state.dailyResetAt) {
      state.dailyCount = 0;
      state.dailyResetAt = this.nextDailyReset(now);
    }
    if (state.backoffUntil && now >= state.backoffUntil) state.backoffUntil = null;
    return state;
  }

  private nextAvailableAt(state: QuotaState): Date | null {
    const resets: Date[] = [];
    if (state.backoffUntil) resets.push(state.backoffUntil);
    if (state.requestCount >= state.requestLimit) {
      resets.push(new Date(state.windowStart.getTime() + state.windowDuration * 1000));
    }
    if (
      state.dailyLimit &&
      state.dailyCount !== null &&
      state.dailyCount >= state.dailyLimit &&
      state.dailyResetAt
    ) {
      resets.push(state.dailyResetAt);
    }
    return resets.length ? new Date(Math.max(...resets.map(reset => reset.getTime()))) : null;
  }

  private async lockPlatform(tx: Prisma.TransactionClient, platformId: string): Promise<void> {
    // Keep PostgreSQL's void lock result out of Prisma's result decoder.
    await tx.$queryRaw<Array<{ locked: number }>>`
      SELECT 1 AS "locked"
      FROM (SELECT pg_advisory_xact_lock(hashtext(${'scheduler-quota:' + platformId}))) AS acquired
    `;
  }

  private async save(tx: Prisma.TransactionClient, state: QuotaState): Promise<void> {
    await tx.$executeRaw`
      INSERT INTO "SchedulerPlatformQuota" (
        "platformId", "windowStart", "windowDuration", "requestCount", "requestLimit",
        "dailyCount", "dailyLimit", "dailyResetAt", "backoffUntil", "updatedAt"
      ) VALUES (
        ${state.platformId}, ${state.windowStart}, ${state.windowDuration},
        ${state.requestCount}, ${state.requestLimit}, ${state.dailyCount},
        ${state.dailyLimit}, ${state.dailyResetAt}, ${state.backoffUntil}, NOW()
      )
      ON CONFLICT ("platformId") DO UPDATE SET
        "windowStart" = EXCLUDED."windowStart",
        "windowDuration" = EXCLUDED."windowDuration",
        "requestCount" = EXCLUDED."requestCount",
        "requestLimit" = EXCLUDED."requestLimit",
        "dailyCount" = EXCLUDED."dailyCount",
        "dailyLimit" = EXCLUDED."dailyLimit",
        "dailyResetAt" = EXCLUDED."dailyResetAt",
        "backoffUntil" = EXCLUDED."backoffUntil",
        "updatedAt" = NOW()
    `;
  }

  private async find(
    client: Prisma.TransactionClient | PrismaClient,
    platformId: string
  ): Promise<StoredQuota | null> {
    const rows = await client.$queryRaw<StoredQuota[]>`
      SELECT "platformId", "windowStart", "windowDuration", "requestCount", "requestLimit",
             "dailyCount", "dailyLimit", "dailyResetAt", "backoffUntil"
      FROM "SchedulerPlatformQuota"
      WHERE "platformId" = ${platformId}
    `;
    return rows[0] ?? null;
  }

  override async reserveRequest(platformId: string): Promise<RateLimitReservation> {
    return this.client.$transaction(async tx => {
      await this.lockPlatform(tx, platformId);
      const now = new Date();
      const state = this.normalize(platformId, await this.find(tx, platformId), now);
      const nextAvailableAt = this.nextAvailableAt(state);
      if (nextAvailableAt) {
        await this.save(tx, state);
        return { allowed: false, nextAvailableAt };
      }
      state.requestCount += 1;
      if (state.dailyCount !== null) state.dailyCount += 1;
      await this.save(tx, state);
      return { allowed: true, nextAvailableAt: null };
    });
  }

  private async readState(platformId: string): Promise<QuotaState> {
    const now = new Date();
    return this.normalize(platformId, await this.find(this.client, platformId), now);
  }

  override async canProcess(platformId: string): Promise<boolean> {
    return this.nextAvailableAt(await this.readState(platformId)) === null;
  }

  override async getNextAvailableAt(platformId: string): Promise<Date | null> {
    return this.nextAvailableAt(await this.readState(platformId));
  }

  override async recordRequest(platformId: string): Promise<void> {
    const reservation = await this.reserveRequest(platformId);
    if (!reservation.allowed) throw new Error(`Rate limit exceeded for ${platformId}`);
  }

  override async setBackoff(platformId: string, durationSeconds: number): Promise<void> {
    await this.client.$transaction(async tx => {
      await this.lockPlatform(tx, platformId);
      const now = new Date();
      const state = this.normalize(platformId, await this.find(tx, platformId), now);
      const requested = new Date(now.getTime() + durationSeconds * 1000);
      if (!state.backoffUntil || requested > state.backoffUntil) state.backoffUntil = requested;
      await this.save(tx, state);
    });
  }

  override async getRemaining(platformId: string): Promise<{ window: number; daily?: number }> {
    const state = await this.readState(platformId);
    return {
      window: Math.max(0, state.requestLimit - state.requestCount),
      daily:
        state.dailyLimit && state.dailyCount !== null
          ? Math.max(0, state.dailyLimit - state.dailyCount)
          : undefined,
    };
  }

  override async getStatus(): Promise<
    Record<string, { remaining: number; resetAt: string; isBackingOff: boolean }>
  > {
    const entries = await Promise.all(
      Object.keys(this.durableConfigs).map(async platformId => {
        const state = await this.readState(platformId);
        return [
          platformId,
          {
            remaining: Math.max(0, state.requestLimit - state.requestCount),
            resetAt: new Date(
              state.windowStart.getTime() + state.windowDuration * 1000
            ).toISOString(),
            isBackingOff: state.backoffUntil !== null,
          },
        ] as const;
      })
    );
    return Object.fromEntries(entries);
  }

  override async reset(platformId: string): Promise<void> {
    await this.client.$executeRaw`
      DELETE FROM "SchedulerPlatformQuota" WHERE "platformId" = ${platformId}
    `;
  }

  override async resetAll(): Promise<void> {
    await this.client.$executeRaw`DELETE FROM "SchedulerPlatformQuota"`;
  }
}

// Singleton instance
let rateLimiter: RateLimiter | null = null;

/**
 * Get the rate limiter instance
 */
export function getRateLimiter(): RateLimiter {
  rateLimiter ??= prisma ? new DurableRateLimiter(prisma) : new RateLimiter();
  return rateLimiter;
}
