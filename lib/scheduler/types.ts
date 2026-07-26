/**
 * Scheduler Types
 * Type definitions for the content scheduling system
 */

/**
 * Job status in the scheduling pipeline
 */
export type JobStatus =
  | 'pending' // Waiting to be scheduled
  | 'scheduled' // In the schedule queue
  | 'processing' // Currently being published
  | 'published' // Successfully published
  | 'failed' // Failed, will retry
  | 'dead' // Exceeded max retries
  | 'reconciliation_required' // Provider outcome is unknown; never auto-republish
  | 'cancelled'; // Manually cancelled

/**
 * Job type classification
 */
export type JobType = 'campaign_post' | 'series_promotion' | 'standalone';

/**
 * Scheduled Job
 */
export interface ScheduledJob {
  id: string;
  idempotencyKey: string;
  type: JobType;

  // Reference to content
  campaignId?: string;
  campaignVersion?: number;
  campaignVersionId?: string;
  approvedContentHash?: string;
  variantId?: string;
  contentId: string;
  platformId: string;

  // Content to publish
  content: {
    text: string;
    mediaUrls?: string[];
    hashtags?: string[];
    mentions?: string[];
    tiktokPrivacyLevel?: string;
    isThread?: boolean;
    threadParts?: { order: number; text: string; mediaUrls?: string[] }[];
  };

  // Scheduling
  scheduledTime: string; // ISO 8601
  timezone: string;

  // Execution state
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  lastAttemptAt?: string;
  nextRetryAt?: string;
  leaseToken?: string;
  leaseExpiresAt?: string;

  // Results
  publishedAt?: string;
  publishedUrl?: string;
  platformPostId?: string;
  error?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

/**
 * Job result after execution
 */
export interface JobResult {
  jobId: string;
  status: 'success' | 'failure';
  platformResponse?: {
    id: string;
    url: string;
    [key: string]: unknown;
  };
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
  executedAt: string;
}

/**
 * Rate limit tracking per platform
 */
export interface PlatformRateLimit {
  platformId: string;

  // Current window
  windowStart: string;
  windowDuration: number; // seconds
  requestCount: number;
  requestLimit: number;

  // Daily limits (some platforms have these)
  dailyCount?: number;
  dailyLimit?: number;
  dailyResetAt?: string;

  // Backoff state
  isBackingOff: boolean;
  backoffUntil?: string;
}

/**
 * Rate limit configuration per platform
 */
export interface RateLimitConfig {
  requests: number; // Max requests
  window: number; // Window in seconds
  daily?: number; // Optional daily limit
}

/**
 * Platform rate limit defaults
 */
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  twitter: { requests: 300, window: 900, daily: 2400 }, // 300/15min, 2400/day
  linkedin: { requests: 100, window: 86400 }, // 100/day
  facebook: { requests: 200, window: 3600 }, // 200/hour
  instagram: { requests: 200, window: 3600 }, // 200/hour
  'custom-channel': { requests: 1000, window: 3600 }, // 1000/hour
};

/**
 * Scheduler configuration
 */
export interface SchedulerConfig {
  checkInterval: number; // How often to check for due jobs (ms)
  batchSize: number; // Max jobs to process per cycle
  maxRetries: number; // Default max retry attempts
  retryDelays: number[]; // Backoff delays in seconds
  leaseDuration: number; // Processing lease duration (ms)
}

/**
 * Default scheduler configuration
 */
export const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  checkInterval: 60000, // 1 minute
  batchSize: 50,
  maxRetries: 5,
  retryDelays: [60, 300, 900, 3600, 14400], // 1m, 5m, 15m, 1h, 4h
  leaseDuration: 2 * 60 * 1000,
};

/**
 * Create job input (without generated fields)
 */
export interface CreateJobInput {
  type: JobType;
  campaignId?: string;
  campaignVersion?: number;
  campaignVersionId?: string;
  approvedContentHash?: string;
  variantId?: string;
  contentId: string;
  platformId: string;
  content: ScheduledJob['content'];
  scheduledTime: string;
  timezone?: string;
  maxAttempts?: number;
  createdBy?: string;
  idempotencyKey?: string;
}

export interface ClaimedJobUpdate extends Partial<ScheduledJob> {
  status: Exclude<JobStatus, 'processing'>;
}

/**
 * Job queue interface
 */
export interface JobQueue {
  add(job: ScheduledJob): Promise<{ job: ScheduledJob; created: boolean }>;
  get(id: string, userId?: string): Promise<ScheduledJob | null>;
  update(id: string, updates: Partial<ScheduledJob>): Promise<void>;
  remove(id: string): Promise<void>;
  getDueJobs(before: Date, limit: number): Promise<ScheduledJob[]>;
  claimDueJobs(
    before: Date,
    limit: number,
    leaseToken: string,
    leaseExpiresAt: Date
  ): Promise<ScheduledJob[]>;
  updateClaimed(id: string, leaseToken: string, updates: ClaimedJobUpdate): Promise<boolean>;
  getByStatus(status: JobStatus, limit?: number, userId?: string): Promise<ScheduledJob[]>;
  getByCampaign(campaignId: string, userId?: string): Promise<ScheduledJob[]>;
  getAll(userId?: string): Promise<ScheduledJob[]>;
  count(): Promise<number>;
  clear(userId?: string): Promise<void>;
}

/**
 * Platform adapter interface
 */
export interface PlatformAdapter {
  platformId: string;
  publish(content: ScheduledJob['content']): Promise<PlatformPublishResult>;
  validateContent(content: ScheduledJob['content']): ValidationResult;
  getMaxLength(): number;
}

/**
 * Platform publish result
 */
export interface PlatformPublishResult {
  id: string;
  url: string;
  platformData?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Content validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Scheduler statistics
 */
export interface SchedulerStats {
  queued: number;
  processing: number;
  publishedToday: number;
  failedToday: number;
  scheduledTotal: number;
  rateLimits: Record<
    string,
    {
      remaining: number;
      resetAt: string;
      isBackingOff: boolean;
    }
  >;
}

/**
 * Webhook event types
 */
export type WebhookEventType =
  | 'job.scheduled'
  | 'job.published'
  | 'job.failed'
  | 'job.dead'
  | 'rate_limit.reached';

/**
 * Webhook event payload
 */
export interface WebhookEvent {
  type: WebhookEventType;
  timestamp: string;
  data: {
    jobId?: string;
    campaignId?: string;
    platformId?: string;
    error?: string;
    url?: string;
  };
}
