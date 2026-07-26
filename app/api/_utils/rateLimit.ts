/**
 * Rate Limiting Utility
 *
 * Implements rate limiting for API endpoints to prevent:
 * - Brute force attacks on authentication
 * - DDoS attacks
 * - Cost exploitation (AI API abuse)
 *
 * Supports two backends:
 * 1. Upstash Redis (recommended for production) - when UPSTASH_REDIS_REST_URL is set
 * 2. In-memory (development/single instance) - fallback when Redis not configured
 */

import { NextRequest, NextResponse } from 'next/server';

// Dynamic import types for Upstash (avoids ESM issues in Jest)
type UpstashRatelimit = InstanceType<typeof import('@upstash/ratelimit').Ratelimit>;

interface RateLimitConfig {
  /**
   * Maximum number of requests allowed
   */
  maxRequests: number;

  /**
   * Time window in milliseconds
   */
  windowMs: number;

  /**
   * Custom error message
   */
  message?: string;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * Safely convert error to string for logging (prevents sensitive data leaks)
 */
function safeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message;
    // Only include stack in debug mode
    if (process.env.DEBUG === 'true' && error.stack) {
      return `${message}\n${error.stack}`;
    }
    return message;
  }
  return String(error);
}

// Check if Upstash Redis is configured
const isUpstashConfigured = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

// Lazy-loaded Upstash rate limiters (avoids ESM import issues in Jest)
let upstashLimiters: Map<string, UpstashRatelimit> | null = null;
let upstashInitialized = false;

/**
 * Initialize Upstash rate limiters lazily
 */
async function initUpstash(): Promise<Map<string, UpstashRatelimit> | null> {
  if (upstashInitialized) return upstashLimiters;
  upstashInitialized = true;

  if (!isUpstashConfigured) {
    // Log warning in production if using in-memory rate limiting
    if (process.env.NODE_ENV === 'production') {
      console.warn(
        '[Rate Limit] Using in-memory rate limiting. For production deployments with multiple instances, configure UPSTASH_REDIS_REST_URL for distributed rate limiting.'
      );
    }
    return null;
  }

  try {
    // Dynamic import to avoid Jest ESM issues
    const { Ratelimit } = await import('@upstash/ratelimit');
    const { Redis } = await import('@upstash/redis');

    const redis = Redis.fromEnv();
    upstashLimiters = new Map();

    // Pre-create rate limiters for each preset
    // AUTH: 5 requests per 15 minutes
    upstashLimiters.set(
      'AUTH',
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, '15 m'),
        analytics: true,
        prefix: 'ratelimit:auth',
      })
    );

    // OAUTH_CALLBACK: 30 requests per 5 minutes
    upstashLimiters.set(
      'OAUTH_CALLBACK',
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(30, '5 m'),
        analytics: true,
        prefix: 'ratelimit:oauth-callback',
      })
    );

    // AI_SERVICE: 10 requests per minute
    upstashLimiters.set(
      'AI_SERVICE',
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, '1 m'),
        analytics: true,
        prefix: 'ratelimit:ai',
      })
    );

    // GENERAL: 100 requests per 15 minutes
    upstashLimiters.set(
      'GENERAL',
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(100, '15 m'),
        analytics: true,
        prefix: 'ratelimit:general',
      })
    );

    // ADMIN: 50 requests per hour
    upstashLimiters.set(
      'ADMIN',
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(50, '1 h'),
        analytics: true,
        prefix: 'ratelimit:admin',
      })
    );

    // PUBLIC_API: 20 requests per minute
    upstashLimiters.set(
      'PUBLIC_API',
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(20, '1 m'),
        analytics: true,
        prefix: 'ratelimit:public',
      })
    );

    return upstashLimiters;
  } catch (error) {
    // Use safe error message to prevent sensitive data leaks
    console.warn(
      '[Rate Limit] Failed to initialize Upstash, falling back to in-memory:',
      safeErrorMessage(error)
    );
    return null;
  }
}

/**
 * PERF-03/MEM-02 Fix: In-memory store for rate limiting with bounded size
 * Uses a Map with safe eviction to prevent unbounded memory growth
 *
 * BUG-06 Fix: Eviction is now rate-limit-aware. Entries that are actively
 * enforcing a rate limit (count >= maxRequests) are never evicted, preventing
 * attackers from flooding the store with unique IPs to reset their own counter.
 */
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * PERF-03 Fix: Maximum number of entries in the rate limit store
 * This prevents memory exhaustion from attackers generating unique IPs
 */
const MAX_RATE_LIMIT_ENTRIES = 10000;

/**
 * BUG-06 Fix: High-water-mark threshold ratio for triggering eviction.
 * When the store reaches this fraction of MAX_RATE_LIMIT_ENTRIES, we
 * proactively evict to avoid hitting the hard cap too frequently.
 */
const EVICTION_HIGH_WATER = 0.9;

/**
 * Last cleanup timestamp for opportunistic cleanup (avoids setInterval in serverless)
 */
let lastCleanup = 0;

/**
 * BUG-06 Fix: Rate-limit-aware eviction.
 *
 * Unlike the old FIFO eviction (evictOldestFromMap), this function:
 * 1. First removes expired entries (safe, they are no longer enforcing anything)
 * 2. Then removes low-count entries (least likely to be actively rate-limiting)
 * 3. Never removes entries at or above their limit — those are actively blocking
 *    an abuser and evicting them would reset the block
 *
 * This prevents the attack vector where an adversary floods from many IPs to
 * push their rate-limited entry out of the store, then retries from the
 * original IP with a fresh counter.
 */
function safeEvict(now: number, targetSize: number): number {
  if (rateLimitStore.size <= targetSize) return 0;

  let removed = 0;

  // Phase 1: Remove all expired entries (always safe)
  const expiredKeys: string[] = [];
  for (const [entryKey, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      expiredKeys.push(entryKey);
    }
  }
  for (const key of expiredKeys) {
    rateLimitStore.delete(key);
    removed++;
  }

  if (rateLimitStore.size <= targetSize) return removed;

  // Phase 2: Remove entries with the lowest counts first (least security-sensitive).
  // Collect non-expired entries and sort by count ascending so we evict the ones
  // that have the most remaining budget (i.e., are least close to being blocked).
  // Entries that have already hit their limit are preserved.
  const evictable: Array<{ key: string; count: number }> = [];
  for (const [entryKey, entry] of rateLimitStore.entries()) {
    // Never evict entries that are actively enforcing a rate limit.
    // We use a conservative threshold: keep anything at 50%+ of any preset's max.
    // The smallest preset max is AUTH at 5, so 50% = 2.5 → keep entries with count >= 3.
    // This is intentionally conservative to avoid helping attackers.
    if (entry.count <= 2) {
      evictable.push({ key: entryKey, count: entry.count });
    }
  }

  // Sort by count ascending — evict lowest-count entries first
  evictable.sort((a, b) => a.count - b.count);

  const needed = rateLimitStore.size - targetSize;
  for (let i = 0; i < Math.min(needed, evictable.length); i++) {
    rateLimitStore.delete(evictable[i].key);
    removed++;
  }

  // If we still exceed target, do a final FIFO pass on remaining entries
  // EXCEPT those at or above the smallest preset limit (5 for AUTH).
  // This is the last resort — we accept going slightly over targetSize
  // rather than evicting actively-blocking entries.
  if (rateLimitStore.size > targetSize) {
    const stillNeeded = rateLimitStore.size - targetSize;
    let finalRemoved = 0;
    for (const [entryKey, entry] of rateLimitStore.entries()) {
      if (finalRemoved >= stillNeeded) break;
      // Protect any entry with count >= 3 (actively accumulating hits)
      if (entry.count < 3) {
        rateLimitStore.delete(entryKey);
        finalRemoved++;
        removed++;
      }
    }
  }

  return removed;
}

/**
 * Get a unique key for rate limiting based on IP and endpoint
 */
function getRateLimitKey(request: NextRequest, endpoint: string): string {
  // Try to get real IP from various headers (proxy-aware)
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] || realIp || 'unknown';

  return `${endpoint}:${ip}`;
}

/**
 * Get client IP for Upstash
 */
function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  return forwarded?.split(',')[0] || realIp || 'unknown';
}

/**
 * BUG-06 Fix: Perform cleanup of expired entries and enforce store bounds.
 *
 * Uses safeEvict which is rate-limit-aware: it never removes entries that
 * are actively enforcing a block, preventing the eviction-based bypass.
 */
function performCleanup(now: number): void {
  safeEvict(now, MAX_RATE_LIMIT_ENTRIES);
}

/**
 * Check if request should be rate limited (in-memory version)
 * Includes opportunistic cleanup of expired entries (no setInterval needed)
 *
 * BUG-06 Fix: The eviction strategy is now rate-limit-aware, so an attacker
 * cannot flood the store to evict their own rate-limited entry. Additionally,
 * when the store is full and no safe eviction is possible, new unknown keys
 * are denied by default (fail-closed) to maintain security under pressure.
 */
function checkRateLimitInMemory(
  request: NextRequest,
  endpoint: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: number } {
  const key = getRateLimitKey(request, endpoint);
  const now = Date.now();

  // PERF-03 Fix: Opportunistic cleanup with size enforcement
  // Every 60 seconds, clean expired entries and enforce max size
  if (now - lastCleanup > 60_000) {
    lastCleanup = now;
    performCleanup(now);
  }

  // BUG-06 Fix: Check for existing entry BEFORE eviction.
  // If this key already exists in the store, we handle it directly
  // without any eviction that could affect it.
  const existingEntry = rateLimitStore.get(key);

  if (existingEntry && existingEntry.resetTime >= now) {
    // Entry exists and is not expired — increment or deny
    if (existingEntry.count < config.maxRequests) {
      const newCount = existingEntry.count + 1;
      rateLimitStore.set(key, {
        count: newCount,
        resetTime: existingEntry.resetTime,
      });
      return {
        allowed: true,
        remaining: config.maxRequests - newCount,
        resetTime: existingEntry.resetTime,
      };
    }

    // Over limit — deny
    return {
      allowed: false,
      remaining: 0,
      resetTime: existingEntry.resetTime,
    };
  }

  // Entry does not exist or is expired — need to create a new one.
  // First, enforce store size bounds with safe eviction.
  if (rateLimitStore.size >= MAX_RATE_LIMIT_ENTRIES) {
    safeEvict(now, Math.floor(MAX_RATE_LIMIT_ENTRIES * EVICTION_HIGH_WATER));

    // BUG-06 Fix: Fail-closed — if we still cannot make room, deny the request.
    // This prevents an attacker from using store exhaustion to bypass limits
    // for OTHER keys. It is better to occasionally deny a legitimate new
    // request than to allow an attacker to evict active rate-limit entries.
    if (rateLimitStore.size >= MAX_RATE_LIMIT_ENTRIES) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: now + config.windowMs,
      };
    }
  }

  // Create new entry (first request in window or expired entry replaced)
  const resetTime = now + config.windowMs;
  rateLimitStore.set(key, {
    count: 1,
    resetTime,
  });
  return {
    allowed: true,
    remaining: config.maxRequests - 1,
    resetTime,
  };
}

// Default window for restrictive fallback (15 minutes)
const DEFAULT_WINDOW_MS = 15 * 60 * 1000;

/**
 * Predefined rate limit configurations
 * Moved before checkRateLimitUpstash to be available for preset lookup
 */
export const RateLimitPresets = {
  /**
   * For authentication endpoints - prevent brute force
   * 5 requests per 15 minutes
   */
  AUTH: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
  },

  /**
   * For OAuth redirect/callback endpoints.
   * These are not password attempts; browser retries, provider redirects, and
   * smoke tests should not consume the brute-force login budget.
   */
  OAUTH_CALLBACK: {
    maxRequests: 30,
    windowMs: 5 * 60 * 1000, // 5 minutes
    message: 'Too many sign-in redirects. Please try again in a few minutes.',
  },

  /**
   * For AI service endpoints - prevent cost exploitation
   * 10 requests per minute
   */
  AI_SERVICE: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many AI requests. Please try again in a minute.',
  },

  /**
   * For general API endpoints
   * 100 requests per 15 minutes
   */
  GENERAL: {
    maxRequests: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
    message: 'Too many requests. Please try again later.',
  },

  /**
   * For admin endpoints
   * 50 requests per hour
   */
  ADMIN: {
    maxRequests: 50,
    windowMs: 60 * 60 * 1000, // 1 hour
    message: 'Too many admin requests. Please try again in an hour.',
  },

  /**
   * For public API endpoints (form submissions, etc.) - stricter limits
   * 20 requests per minute to prevent flooding
   */
  PUBLIC_API: {
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minute
    message: 'Too many requests. Please try again in a minute.',
  },
} satisfies Record<string, RateLimitConfig>;

type RateLimitPresetName = keyof typeof RateLimitPresets;

/**
 * Check if request should be rate limited (Upstash version)
 */
async function checkRateLimitUpstash(
  request: NextRequest,
  presetName: RateLimitPresetName
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  // Lazy-initialize Upstash
  const limiters = await initUpstash();
  const limiter = limiters?.get(presetName);
  const ip = getClientIp(request);

  if (!limiter) {
    // Log error for missing limiter configuration (possible typo in presetName)
    console.error(
      `[Rate Limit] No limiter found for preset "${presetName}" (IP: ${ip}). ` +
        'This may indicate a configuration error. Denying request as a safety measure.'
    );
    // Return restrictive default to preserve rate limiting protection
    return {
      allowed: false,
      remaining: 0,
      resetTime: Date.now() + DEFAULT_WINDOW_MS,
    };
  }

  const { success, remaining, reset } = await limiter.limit(ip);

  return {
    allowed: success,
    remaining,
    resetTime: reset,
  };
}

/**
 * Check if request should be rate limited
 */
export async function checkRateLimit(
  request: NextRequest,
  endpoint: string,
  config: RateLimitConfig,
  presetName?: RateLimitPresetName
): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
  // Use Upstash if configured and preset name provided
  if (isUpstashConfigured && presetName) {
    return checkRateLimitUpstash(request, presetName);
  }

  // Fall back to in-memory
  return checkRateLimitInMemory(request, endpoint, config);
}

/**
 * Synchronous check for backward compatibility (in-memory only)
 */
export function checkRateLimitSync(
  request: NextRequest,
  endpoint: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: number } {
  return checkRateLimitInMemory(request, endpoint, config);
}

/**
 * Rate limit middleware wrapper for API routes
 */
export function withRateLimit<
  T extends (request: NextRequest, ...args: unknown[]) => Promise<Response>,
>(handler: T, endpoint: string, config: RateLimitConfig, presetName?: RateLimitPresetName): T {
  // Resolve the effective config: use preset if provided, otherwise use passed config
  // This ensures headers and messages are consistent with the preset being enforced
  const effectiveConfig =
    presetName && RateLimitPresets[presetName] ? RateLimitPresets[presetName] : config;

  return (async (request: NextRequest, ...args: unknown[]) => {
    const result = await checkRateLimit(request, endpoint, effectiveConfig, presetName);

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
      // Convert resetTime to seconds for HTTP standard compliance
      const resetTimeSeconds = Math.ceil(result.resetTime / 1000);

      return NextResponse.json(
        {
          error: effectiveConfig.message || 'Too many requests',
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': effectiveConfig.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': resetTimeSeconds.toString(),
          },
        }
      );
    }

    // Add rate limit headers to successful responses
    const response = await handler(request, ...args);

    // Convert resetTime to seconds for HTTP standard compliance
    const resetTimeSeconds = Math.ceil(result.resetTime / 1000);

    // Clone response to add headers
    const newResponse = new Response(response.body, response);
    newResponse.headers.set('X-RateLimit-Limit', effectiveConfig.maxRequests.toString());
    newResponse.headers.set('X-RateLimit-Remaining', result.remaining.toString());
    newResponse.headers.set('X-RateLimit-Reset', resetTimeSeconds.toString());

    return newResponse;
  }) as T;
}

/**
 * Check if Upstash is being used
 */
export function isUsingUpstash(): boolean {
  return isUpstashConfigured;
}
