/**
 * Scheduler Service
 * Main scheduling orchestration
 */

import {
  ScheduledJob,
  JobResult,
  JobStatus,
  CreateJobInput,
  SchedulerConfig,
  SchedulerStats,
  DEFAULT_SCHEDULER_CONFIG,
  WebhookEvent,
  WebhookEventType,
  JobQueue,
  ScheduleJobResult,
  ListJobsOptions,
  ListJobsResult,
} from './types';
import { createHash } from 'node:crypto';
import { getQueue, generateJobId } from './queue';
import { getRateLimiter, RateLimiter } from './rate-limiter';
import { getRetryHandler, RetryHandler } from './retry-handler';
import { getPublisher, Publisher } from './publisher';
import { CampaignPublishAuditInput, PrismaJobQueue, SchedulerQueueError } from './prisma-queue';

function deriveRequestFingerprint(
  input: CreateJobInput,
  timezone: string,
  maxAttempts: number
): string {
  const identity = JSON.stringify({
    type: input.type,
    campaignId: input.campaignId ?? null,
    campaignVersion: input.campaignVersion ?? null,
    campaignVersionId: input.campaignVersionId ?? null,
    approvedContentHash: input.approvedContentHash ?? null,
    variantId: input.variantId ?? null,
    contentId: input.contentId,
    platformId: input.platformId,
    content: input.idempotencyContent ?? input.content,
    scheduledTime: new Date(input.scheduledTime).toISOString(),
    timezone,
    maxAttempts,
  });
  return createHash('sha256').update(identity).digest('hex');
}

/**
 * Scheduler Service
 * Manages job scheduling, processing, and lifecycle
 */
export class Scheduler {
  private readonly config: SchedulerConfig;
  private readonly queue: JobQueue;
  private readonly rateLimiter: RateLimiter;
  private readonly retryHandler: RetryHandler;
  private readonly publisher: Publisher;
  private readonly webhookUrls: Map<WebhookEventType, string[]> = new Map();

  constructor(config?: Partial<SchedulerConfig>) {
    this.config = { ...DEFAULT_SCHEDULER_CONFIG, ...config };
    this.queue = getQueue();
    this.rateLimiter = getRateLimiter();
    this.retryHandler = getRetryHandler();
    this.publisher = getPublisher();
  }

  /**
   * Schedule a new job
   */
  async schedule(input: CreateJobInput): Promise<ScheduledJob> {
    return (await this.scheduleWithResult(input)).job;
  }

  private createValidatedJob(input: CreateJobInput): ScheduledJob {
    const now = new Date().toISOString();
    const timezone = input.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const maxAttempts = input.maxAttempts || this.config.maxRetries;
    const requestFingerprint = deriveRequestFingerprint(input, timezone, maxAttempts);
    const id = generateJobId();

    const job: ScheduledJob = {
      id,
      idempotencyKey: input.idempotencyKey ?? `scheduler:v1:${id}`,
      requestFingerprint,
      type: input.type,
      campaignId: input.campaignId,
      campaignVersion: input.campaignVersion,
      campaignVersionId: input.campaignVersionId,
      approvedContentHash: input.approvedContentHash,
      variantId: input.variantId,
      contentId: input.contentId,
      platformId: input.platformId,
      content: input.content,
      scheduledTime: input.scheduledTime,
      timezone,
      status: 'scheduled',
      attempts: 0,
      maxAttempts,
      createdAt: now,
      updatedAt: now,
      createdBy: input.createdBy,
    };

    // Validate content before scheduling
    const validation = this.publisher.validate(job);
    if (!validation.valid) {
      throw new Error(`Content validation failed: ${validation.errors.join(', ')}`);
    }

    return job;
  }

  private async emitCreated(result: ScheduleJobResult): Promise<ScheduleJobResult> {
    if (result.created) {
      await this.emitEvent('job.scheduled', {
        jobId: result.job.id,
        campaignId: result.job.campaignId,
      });
    }
    return result;
  }

  async scheduleWithResult(input: CreateJobInput): Promise<ScheduleJobResult> {
    const job = this.createValidatedJob(input);
    return this.emitCreated(await this.queue.add(job));
  }

  async findIdempotentReplay(input: CreateJobInput): Promise<ScheduleJobResult | null> {
    if (!input.createdBy || !input.idempotencyKey || !(this.queue instanceof PrismaJobQueue)) {
      return null;
    }
    const existing = await this.queue.getByIdempotencyKey(input.createdBy, input.idempotencyKey);
    if (!existing) return null;

    const candidate = this.createValidatedJob({
      ...input,
      campaignVersionId: input.campaignVersionId ?? existing.campaignVersionId,
      timezone: input.timezone ?? existing.timezone,
      maxAttempts: input.maxAttempts ?? existing.maxAttempts,
    });
    if (candidate.requestFingerprint !== existing.requestFingerprint) {
      throw new SchedulerQueueError(
        'IDEMPOTENCY_CONFLICT',
        'The idempotency key already identifies a different scheduler request'
      );
    }
    return { job: existing, created: false };
  }

  async scheduleCampaignWithAudit(
    input: CreateJobInput,
    audit: CampaignPublishAuditInput
  ): Promise<ScheduleJobResult> {
    if (!(this.queue instanceof PrismaJobQueue)) {
      throw new Error('Campaign scheduling requires durable PostgreSQL persistence');
    }

    const job = this.createValidatedJob(input);
    return this.emitCreated(await this.queue.addCampaignJob(job, audit));
  }

  /**
   * Schedule multiple jobs at once
   */
  async scheduleBatch(inputs: CreateJobInput[]): Promise<ScheduledJob[]> {
    const jobs: ScheduledJob[] = [];

    for (const input of inputs) {
      try {
        const job = await this.schedule(input);
        jobs.push(job);
      } catch (error) {
        console.error(`Failed to schedule job for content ${input.contentId}:`, error);
      }
    }

    return jobs;
  }

  /**
   * Cancel a scheduled job
   */
  async cancel(jobId: string, userId?: string): Promise<boolean> {
    const job = await this.queue.get(jobId, userId);

    if (!job) {
      return false;
    }

    if (!['scheduled', 'failed'].includes(job.status)) {
      throw new Error(`Cannot cancel job in status: ${job.status}`);
    }

    return this.queue.updateIfStatus(
      jobId,
      ['scheduled', 'failed'],
      { status: 'cancelled', updatedAt: new Date().toISOString() },
      userId
    );
  }

  /**
   * Reschedule a job to a new time
   */
  async reschedule(
    jobId: string,
    newScheduledTime: string,
    userId?: string
  ): Promise<ScheduledJob | null> {
    const job = await this.queue.get(jobId, userId);

    if (!job) {
      return null;
    }

    if (!['scheduled', 'failed', 'cancelled'].includes(job.status)) {
      throw new Error(`Cannot reschedule job in status: ${job.status}`);
    }

    const updated = await this.queue.updateIfStatus(
      jobId,
      ['scheduled', 'failed', 'cancelled'],
      {
        scheduledTime: newScheduledTime,
        status: 'scheduled',
        nextRetryAt: undefined,
        errorCode: undefined,
        error: undefined,
        updatedAt: new Date().toISOString(),
      },
      userId
    );
    if (!updated) return null;

    return this.queue.get(jobId, userId);
  }

  /**
   * Process due jobs
   */
  async processDueJobs(): Promise<JobResult[]> {
    const results: JobResult[] = [];

    // Claim immediately before publishing so jobs later in a batch do not spend
    // most of their lease waiting for earlier provider calls to complete.
    for (let processed = 0; processed < this.config.batchSize; processed += 1) {
      const now = new Date();
      const leaseToken = generateJobId();
      const [job] = await this.queue.claimDueJobs(
        now,
        1,
        leaseToken,
        new Date(now.getTime() + this.config.leaseDuration)
      );
      if (!job) break;

      const validation = this.publisher.validate(job);
      if (!validation.valid) {
        const rejected = await this.queue.updateClaimed(job.id, leaseToken, {
          status: 'dead',
          error: `Content validation failed: ${validation.errors.join(', ')}`,
          updatedAt: now.toISOString(),
        });
        results.push({
          jobId: job.id,
          status: 'failure',
          error: {
            code: rejected ? 'VALIDATION_FAILED' : 'LEASE_LOST',
            message: rejected
              ? `Content validation failed: ${validation.errors.join(', ')}`
              : 'The scheduler processing lease changed before validation was recorded',
            retryable: false,
          },
          executedAt: now.toISOString(),
        });
        continue;
      }

      const quota = await this.rateLimiter.reserveRequest(job.platformId);
      if (!quota.allowed) {
        const nextAvailableAt =
          quota.nextAvailableAt ?? new Date(now.getTime() + this.config.checkInterval);
        const deferred = await this.queue.updateClaimed(job.id, leaseToken, {
          status: 'failed',
          error: 'Platform rate limit is active; no provider request was attempted',
          nextRetryAt: nextAvailableAt.toISOString(),
          updatedAt: now.toISOString(),
        });
        results.push({
          jobId: job.id,
          status: 'failure',
          error: {
            code: deferred ? 'RATE_LIMITED' : 'LEASE_LOST',
            message: deferred
              ? 'Platform rate limit is active; job deferred without consuming an attempt'
              : 'The scheduler processing lease changed before rate-limit deferral was recorded',
            retryable: deferred,
          },
          executedAt: now.toISOString(),
        });
        continue;
      }

      const result = await this.processJob(job, leaseToken);
      results.push(result);
    }

    return results;
  }

  /**
   * Process a single job
   */
  private async processJob(job: ScheduledJob, leaseToken: string): Promise<JobResult> {
    let attemptedJob = job;

    // Attempt to publish
    const publishResult = await this.publishWithLeaseHeartbeat(job, leaseToken, async () => {
      const marked = await this.queue.markClaimAttempt(job.id, leaseToken, new Date());
      if (!marked) return false;
      attemptedJob = marked;
      return true;
    });

    if (publishResult.success && publishResult.result) {
      const completedAt = new Date().toISOString();
      const completed = await this.queue.updateClaimed(job.id, leaseToken, {
        status: 'published',
        publishedAt: completedAt,
        publishedUrl: publishResult.result.url,
        platformPostId: publishResult.result.id,
        errorCode: undefined,
        error: undefined,
        updatedAt: completedAt,
      });
      if (!completed) {
        return {
          jobId: job.id,
          status: 'failure',
          error: {
            code: 'UNKNOWN_PROVIDER_RESULT',
            message:
              'Provider accepted the request but the processing lease could not be completed',
            retryable: false,
          },
          executedAt: completedAt,
        };
      }

      await this.emitEvent('job.published', {
        jobId: job.id,
        campaignId: job.campaignId,
        platformId: job.platformId,
        url: publishResult.result.url,
      });

      return {
        jobId: job.id,
        status: 'success',
        platformResponse: publishResult.result,
        executedAt: completedAt,
      };
    }

    // Failure - handle retry
    return this.handleFailure(attemptedJob, leaseToken, publishResult.error!);
  }

  private async publishWithLeaseHeartbeat(
    job: ScheduledJob,
    leaseToken: string,
    beforeProviderCall: () => Promise<boolean>
  ): Promise<Awaited<ReturnType<Publisher['publish']>>> {
    let stopHeartbeat: (() => Promise<void>) | undefined;
    try {
      return await this.publisher.publish(job, {
        quotaReserved: true,
        beforeProviderCall: async () => {
          const marked = await beforeProviderCall();
          if (marked) {
            stopHeartbeat = this.startLeaseHeartbeat(job.id, leaseToken);
          }
          return marked;
        },
      });
    } finally {
      await stopHeartbeat?.();
    }
  }

  private startLeaseHeartbeat(jobId: string, leaseToken: string): () => Promise<void> {
    const heartbeatInterval = Math.max(100, Math.floor(this.config.leaseDuration / 3));
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let activeRenewal: Promise<void> = Promise.resolve();

    const renew = (): void => {
      activeRenewal = this.queue
        .renewClaimLease(jobId, leaseToken, new Date(Date.now() + this.config.leaseDuration))
        .then(renewed => {
          if (!renewed) stopped = true;
        })
        .catch(error => {
          console.error(`Failed to renew scheduler lease for ${jobId}:`, error);
        })
        .finally(() => {
          if (!stopped) timer = setTimeout(renew, heartbeatInterval);
        });
    };

    timer = setTimeout(renew, heartbeatInterval);
    return async () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      await activeRenewal;
      if (timer) clearTimeout(timer);
    };
  }

  /**
   * Handle job failure with retry logic
   */
  private async handleFailure(
    job: ScheduledJob,
    leaseToken: string,
    error: Error & { code?: string; retryable?: boolean }
  ): Promise<JobResult> {
    const now = new Date().toISOString();

    const shouldRetry = this.retryHandler.shouldRetry(job, error);

    if (shouldRetry.retry && shouldRetry.nextRetryAt) {
      // Schedule retry
      const updated = await this.queue.updateClaimed(job.id, leaseToken, {
        status: 'failed',
        errorCode: shouldRetry.classification.code,
        error: shouldRetry.classification.message,
        nextRetryAt: shouldRetry.nextRetryAt.toISOString(),
        updatedAt: now,
      });
      if (!updated) {
        return {
          jobId: job.id,
          status: 'failure',
          error: {
            code: 'LEASE_LOST',
            message: 'The scheduler processing lease changed before retry state was recorded',
            retryable: false,
          },
          executedAt: now,
        };
      }

      await this.emitEvent('job.failed', {
        jobId: job.id,
        campaignId: job.campaignId,
        platformId: job.platformId,
        error: shouldRetry.classification.message,
      });

      return {
        jobId: job.id,
        status: 'failure',
        error: {
          code: shouldRetry.classification.code,
          message: shouldRetry.classification.message,
          retryable: true,
        },
        executedAt: now,
      };
    }

    // Move to dead letter queue (no more retries)
    const updated = await this.queue.updateClaimed(job.id, leaseToken, {
      status: 'dead',
      errorCode: shouldRetry.classification.code,
      error: shouldRetry.classification.message,
      updatedAt: now,
    });
    if (!updated) {
      return {
        jobId: job.id,
        status: 'failure',
        error: {
          code: 'LEASE_LOST',
          message: 'The scheduler processing lease changed before dead-letter state was recorded',
          retryable: false,
        },
        executedAt: now,
      };
    }

    await this.emitEvent('job.dead', {
      jobId: job.id,
      campaignId: job.campaignId,
      platformId: job.platformId,
      error: shouldRetry.classification.message,
    });

    return {
      jobId: job.id,
      status: 'failure',
      error: {
        code: shouldRetry.classification.code,
        message: shouldRetry.classification.message,
        retryable: false,
      },
      executedAt: now,
    };
  }

  /**
   * Manually retry a failed/dead job
   */
  async retry(jobId: string, userId?: string): Promise<ScheduledJob | null> {
    const job = await this.queue.get(jobId, userId);

    if (!job) {
      return null;
    }

    if (!['failed', 'dead'].includes(job.status)) {
      throw new Error(`Cannot retry job in status: ${job.status}`);
    }

    // Reset for retry
    const updated = await this.queue.updateIfStatus(
      jobId,
      ['failed', 'dead'],
      {
        status: 'scheduled',
        scheduledTime: new Date().toISOString(),
        nextRetryAt: undefined,
        attempts: 0,
        updatedAt: new Date().toISOString(),
      },
      userId
    );
    if (!updated) return null;

    return this.queue.get(jobId, userId);
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string, userId?: string): Promise<ScheduledJob | null> {
    return this.queue.get(jobId, userId);
  }

  /**
   * Get all jobs
   */
  async getAllJobs(userId?: string): Promise<ScheduledJob[]> {
    return this.queue.getAll(userId);
  }

  async listJobs(options: ListJobsOptions): Promise<ListJobsResult> {
    return this.queue.list(options);
  }

  /**
   * Get jobs by status
   */
  async getJobsByStatus(
    status: JobStatus,
    limit?: number,
    userId?: string
  ): Promise<ScheduledJob[]> {
    return this.queue.getByStatus(status, limit, userId);
  }

  /**
   * Get jobs for a campaign
   */
  async getJobsByCampaign(campaignId: string, userId?: string): Promise<ScheduledJob[]> {
    return this.queue.getByCampaign(campaignId, userId);
  }

  /**
   * Get scheduler statistics
   */
  async getStats(): Promise<SchedulerStats> {
    const allJobs = await this.queue.getAll();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats: SchedulerStats = {
      queued: 0,
      processing: 0,
      publishedToday: 0,
      failedToday: 0,
      scheduledTotal: 0,
      rateLimits: {},
    };

    for (const job of allJobs) {
      switch (job.status) {
        case 'scheduled':
          stats.scheduledTotal++;
          stats.queued++;
          break;
        case 'processing':
          stats.processing++;
          break;
        case 'published':
          if (job.publishedAt && new Date(job.publishedAt) >= today) {
            stats.publishedToday++;
          }
          break;
        case 'failed':
        case 'dead':
        case 'reconciliation_required':
          if (job.lastAttemptAt && new Date(job.lastAttemptAt) >= today) {
            stats.failedToday++;
          }
          // Failed jobs waiting for retry are also queued
          if (job.status === 'failed') {
            stats.queued++;
          }
          break;
      }
    }

    stats.rateLimits = await this.rateLimiter.getStatus();

    return stats;
  }

  /**
   * Register a webhook for events
   */
  registerWebhook(eventType: WebhookEventType, url: string): void {
    const urls = this.webhookUrls.get(eventType) || [];
    if (!urls.includes(url)) {
      urls.push(url);
      this.webhookUrls.set(eventType, urls);
    }
  }

  /**
   * Emit a webhook event
   */
  private async emitEvent(type: WebhookEventType, data: WebhookEvent['data']): Promise<void> {
    const urls = this.webhookUrls.get(type);
    if (!urls || urls.length === 0) return;

    const event: WebhookEvent = {
      type,
      timestamp: new Date().toISOString(),
      data,
    };

    // Fire and forget - don't block on webhook delivery
    for (const url of urls) {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      }).catch(err => {
        console.error(`Failed to deliver webhook to ${url}:`, err);
      });
    }
  }

  /**
   * Clear all jobs (for testing)
   */
  async clearAll(userId?: string): Promise<void> {
    await this.queue.clear(userId);
  }
}

// Singleton instance
let scheduler: Scheduler | null = null;

/**
 * Get the scheduler instance
 */
export function getScheduler(config?: Partial<SchedulerConfig>): Scheduler {
  scheduler ??= new Scheduler(config);
  return scheduler;
}
