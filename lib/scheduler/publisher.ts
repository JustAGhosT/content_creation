/**
 * Publisher Service
 * Handles publishing content to platforms
 */

import { ScheduledJob, PlatformPublishResult, ValidationResult } from './types';
import { getAdapter } from './adapters';
import { getRateLimiter } from './rate-limiter';
import { getRetryHandler } from './retry-handler';

/**
 * Publisher error
 */
export class PublishError extends Error {
  code: string;
  retryable: boolean;
  originalError?: unknown;

  constructor(message: string, code: string, retryable: boolean, originalError?: unknown) {
    super(message);
    this.name = 'PublishError';
    this.code = code;
    this.retryable = retryable;
    this.originalError = originalError;
  }
}

/**
 * Publish result with metadata
 */
export interface PublishResultWithMeta {
  success: boolean;
  result?: PlatformPublishResult;
  error?: PublishError;
  duration: number;
  rateLimited: boolean;
}

/**
 * Publisher Service
 * Coordinates content validation and publishing
 */
export class Publisher {
  private readonly rateLimiter = getRateLimiter();
  private readonly retryHandler = getRetryHandler();

  /**
   * Validate content for a platform
   */
  validate(job: ScheduledJob): ValidationResult {
    const adapter = getAdapter(job.platformId);

    if (!adapter) {
      return {
        valid: false,
        errors: [`No adapter found for platform: ${job.platformId}`],
        warnings: [],
      };
    }

    return adapter.validateContent(job.content);
  }

  /**
   * Check if publishing is allowed (rate limits)
   */
  async canPublish(platformId: string): Promise<boolean> {
    return this.rateLimiter.canProcess(platformId);
  }

  /**
   * Publish a job to its platform
   */
  async publish(
    job: ScheduledJob,
    options: { quotaReserved?: boolean; beforeProviderCall?: () => Promise<boolean> } = {}
  ): Promise<PublishResultWithMeta> {
    const startTime = Date.now();

    // Get adapter
    const adapter = getAdapter(job.platformId);
    if (!adapter) {
      return {
        success: false,
        error: new PublishError(
          `No adapter found for platform: ${job.platformId}`,
          'ADAPTER_NOT_FOUND',
          false
        ),
        duration: Date.now() - startTime,
        rateLimited: false,
      };
    }

    // Validate content
    const validation = adapter.validateContent(job.content);
    if (!validation.valid) {
      return {
        success: false,
        error: new PublishError(
          `Content validation failed: ${validation.errors.join(', ')}`,
          'VALIDATION_FAILED',
          false
        ),
        duration: Date.now() - startTime,
        rateLimited: false,
      };
    }

    // Reserve shared capacity only after all local validation succeeds.
    const quota = options.quotaReserved
      ? { allowed: true }
      : await this.rateLimiter.reserveRequest(job.platformId);
    if (!quota.allowed) {
      return {
        success: false,
        error: new PublishError('Rate limit exceeded', 'RATE_LIMITED', true),
        duration: Date.now() - startTime,
        rateLimited: true,
      };
    }

    try {
      if (options.beforeProviderCall && !(await options.beforeProviderCall())) {
        return {
          success: false,
          error: new PublishError(
            'The scheduler processing lease changed before the provider call',
            'LEASE_LOST',
            false
          ),
          duration: Date.now() - startTime,
          rateLimited: false,
        };
      }
      // Publish
      const result = await adapter.publish(job.content, { userId: job.createdBy });

      return {
        success: true,
        result,
        duration: Date.now() - startTime,
        rateLimited: false,
      };
    } catch (error) {
      const classification = this.retryHandler.classifyError(error);

      // Handle rate limit response from API
      if (classification.code === 'RATE_LIMITED') {
        await this.rateLimiter.setBackoff(job.platformId, 900); // 15 min backoff
      }

      return {
        success: false,
        error: new PublishError(
          classification.message,
          classification.code,
          classification.retryable,
          error
        ),
        duration: Date.now() - startTime,
        rateLimited: classification.code === 'RATE_LIMITED',
      };
    }
  }

  /**
   * Get remaining rate limit for a platform
   */
  async getRemainingQuota(platformId: string): Promise<{ window: number; daily?: number }> {
    return this.rateLimiter.getRemaining(platformId);
  }

  /**
   * Get rate limit status for all platforms
   */
  async getRateLimitStatus(): Promise<
    Record<
      string,
      {
        remaining: number;
        resetAt: string;
        isBackingOff: boolean;
      }
    >
  > {
    return this.rateLimiter.getStatus();
  }
}

// Singleton instance
let publisher: Publisher | null = null;

/**
 * Get the publisher instance
 */
export function getPublisher(): Publisher {
  publisher ??= new Publisher();
  return publisher;
}
