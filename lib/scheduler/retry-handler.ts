/**
 * Retry Handler
 * Manages retry logic with exponential backoff
 */

import { ScheduledJob, DEFAULT_SCHEDULER_CONFIG } from './types';

/**
 * Error classification for retry decisions
 */
export interface ErrorClassification {
  retryable: boolean;
  code: string;
  message: string;
  backoffMultiplier?: number; // Multiply standard backoff (e.g., 2x for rate limits)
}

/**
 * Retry Handler
 * Determines retry strategy based on error type
 */
export class RetryHandler {
  private readonly retryDelays: number[];
  private readonly maxRetries: number;

  constructor(
    retryDelays: number[] = DEFAULT_SCHEDULER_CONFIG.retryDelays,
    maxRetries: number = DEFAULT_SCHEDULER_CONFIG.maxRetries
  ) {
    this.retryDelays = retryDelays;
    this.maxRetries = maxRetries;
  }

  /**
   * Classify an error for retry handling
   */
  classifyError(error: unknown): ErrorClassification {
    // Handle axios-style errors with status codes
    if (this.isAxiosError(error)) {
      return this.classifyHttpError(error);
    }

    // Network errors - retryable
    if (this.isNetworkError(error)) {
      return {
        retryable: true,
        code: 'NETWORK_ERROR',
        message: `Network error: ${this.getErrorMessage(error)}`,
      };
    }

    // Timeout errors - retryable
    if (this.isTimeoutError(error)) {
      return {
        retryable: true,
        code: 'TIMEOUT',
        message: `Request timeout: ${this.getErrorMessage(error)}`,
      };
    }

    // Unknown errors - retryable by default with caution
    return {
      retryable: true,
      code: 'UNKNOWN',
      message: this.getErrorMessage(error),
    };
  }

  /**
   * Classify HTTP errors by status code
   */
  private classifyHttpError(error: {
    response?: { status?: number; data?: { message?: string } };
    message?: string;
  }): ErrorClassification {
    const status = error.response?.status;
    const message = error.response?.data?.message || error.message || 'Unknown error';

    // Provider billing and credit failures require an operator action. Retrying
    // cannot change the outcome and can consume the job's entire retry budget.
    if (status === 402) {
      return {
        retryable: false,
        code: 'PAYMENT_REQUIRED',
        message: `Provider credits or billing required (402): ${message}`,
      };
    }

    // Rate limit errors - retryable with longer backoff
    if (status === 429) {
      return {
        retryable: true,
        code: 'RATE_LIMITED',
        message: `Rate limited: ${message}`,
        backoffMultiplier: 2,
      };
    }

    // Server errors - retryable
    if (status && status >= 500) {
      return {
        retryable: true,
        code: 'SERVER_ERROR',
        message: `Server error (${status}): ${message}`,
      };
    }

    // Auth errors - not retryable
    if (status === 401 || status === 403) {
      return {
        retryable: false,
        code: 'AUTH_ERROR',
        message: `Authentication error (${status}): ${message}`,
      };
    }

    // Bad request - not retryable (content issue)
    if (status === 400) {
      return {
        retryable: false,
        code: 'BAD_REQUEST',
        message: `Bad request: ${message}`,
      };
    }

    // Not found - not retryable
    if (status === 404) {
      return {
        retryable: false,
        code: 'NOT_FOUND',
        message: `Resource not found: ${message}`,
      };
    }

    // Other client errors (4xx) - generally not retryable
    if (status && status >= 400 && status < 500) {
      return {
        retryable: false,
        code: 'CLIENT_ERROR',
        message: `Client error (${status}): ${message}`,
      };
    }

    // Unknown HTTP error
    return {
      retryable: true,
      code: 'UNKNOWN',
      message: `Unknown HTTP error: ${message}`,
    };
  }

  /**
   * Check if error is axios-like with response
   */
  private isAxiosError(error: unknown): error is {
    response?: { status?: number; data?: { message?: string } };
    message?: string;
    code?: string;
  } {
    return typeof error === 'object' && error !== null && 'response' in error;
  }

  /**
   * Check if error is a network error
   */
  private isNetworkError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) return false;

    const errorCode = (error as { code?: string }).code;
    const networkErrorCodes = [
      'ECONNRESET',
      'ECONNREFUSED',
      'ENOTFOUND',
      'ENETUNREACH',
      'EAI_AGAIN',
      'EPIPE',
    ];

    return errorCode !== undefined && networkErrorCodes.includes(errorCode);
  }

  /**
   * Check if error is a timeout
   */
  private isTimeoutError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) return false;

    const errorCode = (error as { code?: string }).code;
    const errorMessage = (error as { message?: string }).message || '';

    return (
      errorCode === 'ETIMEDOUT' ||
      errorCode === 'ESOCKETTIMEDOUT' ||
      errorMessage.toLowerCase().includes('timeout')
    );
  }

  /**
   * Get error message from unknown error
   */
  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    if (typeof error === 'object' && error !== null && 'message' in error) {
      return String((error as { message: unknown }).message);
    }
    return 'Unknown error';
  }

  /**
   * Calculate next retry time
   */
  getNextRetryTime(job: ScheduledJob, classification: ErrorClassification): Date | null {
    const attempts = job.attempts;

    // Check if we've exceeded max retries
    if (attempts >= job.maxAttempts) {
      return null;
    }

    // Get base delay for this attempt
    const delayIndex = Math.min(attempts, this.retryDelays.length - 1);
    let delay = this.retryDelays[delayIndex];

    // Apply backoff multiplier if specified
    if (classification.backoffMultiplier) {
      delay *= classification.backoffMultiplier;
    }

    // Add jitter (±10%) to prevent thundering herd
    // NOTE: Using Math.random() is intentional - jitter does not require
    // cryptographic security, just some variation to avoid synchronized retries
    const jitter = delay * 0.1 * (Math.random() * 2 - 1); // NOSONAR
    delay += jitter;

    return new Date(Date.now() + delay * 1000);
  }

  /**
   * Determine if a job should be retried
   */
  shouldRetry(
    job: ScheduledJob,
    error: unknown
  ): {
    retry: boolean;
    nextRetryAt?: Date;
    classification: ErrorClassification;
  } {
    const classification = this.classifyError(error);

    if (!classification.retryable) {
      return { retry: false, classification };
    }

    const nextRetryAt = this.getNextRetryTime(job, classification);

    if (!nextRetryAt) {
      return { retry: false, classification };
    }

    return {
      retry: true,
      nextRetryAt,
      classification,
    };
  }

  /**
   * Get retry delay for a specific attempt number
   */
  getRetryDelay(attempt: number): number {
    const index = Math.min(attempt, this.retryDelays.length - 1);
    return this.retryDelays[index];
  }

  /**
   * Get all retry delays
   */
  getRetryDelays(): number[] {
    return [...this.retryDelays];
  }

  /**
   * Get max retries
   */
  getMaxRetries(): number {
    return this.maxRetries;
  }
}

// Singleton instance
let retryHandler: RetryHandler | null = null;

/**
 * Get the retry handler instance
 */
export function getRetryHandler(): RetryHandler {
  retryHandler ??= new RetryHandler();
  return retryHandler;
}
