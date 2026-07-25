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
} from './types';
import { getQueue, generateJobId } from './queue';
import { getRateLimiter, RateLimiter } from './rate-limiter';
import { getRetryHandler, RetryHandler } from './retry-handler';
import { getPublisher, Publisher } from './publisher';

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
    const now = new Date().toISOString();

    const job: ScheduledJob = {
      id: generateJobId(),
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
      timezone: input.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
      status: 'scheduled',
      attempts: 0,
      maxAttempts: input.maxAttempts || this.config.maxRetries,
      createdAt: now,
      updatedAt: now,
      createdBy: input.createdBy,
    };

    // Validate content before scheduling
    const validation = this.publisher.validate(job);
    if (!validation.valid) {
      throw new Error(`Content validation failed: ${validation.errors.join(', ')}`);
    }

    await this.queue.add(job);
    await this.emitEvent('job.scheduled', { jobId: job.id, campaignId: job.campaignId });

    return job;
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
  async cancel(jobId: string): Promise<boolean> {
    const job = await this.queue.get(jobId);

    if (!job) {
      return false;
    }

    if (!['scheduled', 'failed'].includes(job.status)) {
      throw new Error(`Cannot cancel job in status: ${job.status}`);
    }

    await this.queue.update(jobId, {
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
    });

    return true;
  }

  /**
   * Reschedule a job to a new time
   */
  async reschedule(jobId: string, newScheduledTime: string): Promise<ScheduledJob | null> {
    const job = await this.queue.get(jobId);

    if (!job) {
      return null;
    }

    if (!['scheduled', 'failed', 'cancelled'].includes(job.status)) {
      throw new Error(`Cannot reschedule job in status: ${job.status}`);
    }

    await this.queue.update(jobId, {
      scheduledTime: newScheduledTime,
      status: 'scheduled',
      nextRetryAt: undefined,
      updatedAt: new Date().toISOString(),
    });

    return this.queue.get(jobId);
  }

  /**
   * Process due jobs
   */
  async processDueJobs(): Promise<JobResult[]> {
    const now = new Date();
    const dueJobs = await this.queue.getDueJobs(now, this.config.batchSize);

    const results: JobResult[] = [];

    for (const job of dueJobs) {
      // Check rate limits before processing
      if (!(await this.rateLimiter.canProcess(job.platformId))) {
        // Skip, will be picked up in next cycle
        continue;
      }

      const result = await this.processJob(job);
      results.push(result);
    }

    return results;
  }

  /**
   * Process a single job
   */
  private async processJob(job: ScheduledJob): Promise<JobResult> {
    const now = new Date().toISOString();

    // Update to processing status
    await this.queue.update(job.id, {
      status: 'processing',
      lastAttemptAt: now,
      attempts: job.attempts + 1,
    });

    // Refresh job from queue
    const currentJob = await this.queue.get(job.id);
    if (!currentJob) {
      return {
        jobId: job.id,
        status: 'failure',
        error: { code: 'NOT_FOUND', message: 'Job not found', retryable: false },
        executedAt: now,
      };
    }

    // Attempt to publish
    const publishResult = await this.publisher.publish(currentJob);

    if (publishResult.success && publishResult.result) {
      // Success
      await this.queue.update(job.id, {
        status: 'published',
        publishedAt: now,
        publishedUrl: publishResult.result.url,
        platformPostId: publishResult.result.id,
        updatedAt: now,
      });

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
        executedAt: now,
      };
    }

    // Failure - handle retry
    return this.handleFailure(currentJob, publishResult.error!);
  }

  /**
   * Handle job failure with retry logic
   */
  private async handleFailure(
    job: ScheduledJob,
    error: Error & { code?: string; retryable?: boolean }
  ): Promise<JobResult> {
    const now = new Date().toISOString();

    const shouldRetry = this.retryHandler.shouldRetry(job, error);

    if (shouldRetry.retry && shouldRetry.nextRetryAt) {
      // Schedule retry
      await this.queue.update(job.id, {
        status: 'failed',
        error: shouldRetry.classification.message,
        nextRetryAt: shouldRetry.nextRetryAt.toISOString(),
        updatedAt: now,
      });

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
    await this.queue.update(job.id, {
      status: 'dead',
      error: shouldRetry.classification.message,
      updatedAt: now,
    });

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
  async retry(jobId: string): Promise<ScheduledJob | null> {
    const job = await this.queue.get(jobId);

    if (!job) {
      return null;
    }

    if (!['failed', 'dead'].includes(job.status)) {
      throw new Error(`Cannot retry job in status: ${job.status}`);
    }

    // Reset for retry
    await this.queue.update(jobId, {
      status: 'scheduled',
      scheduledTime: new Date().toISOString(),
      nextRetryAt: undefined,
      error: undefined,
      attempts: 0,
      updatedAt: new Date().toISOString(),
    });

    return this.queue.get(jobId);
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string): Promise<ScheduledJob | null> {
    return this.queue.get(jobId);
  }

  /**
   * Get all jobs
   */
  async getAllJobs(): Promise<ScheduledJob[]> {
    return this.queue.getAll();
  }

  /**
   * Get jobs by status
   */
  async getJobsByStatus(status: JobStatus, limit?: number): Promise<ScheduledJob[]> {
    return this.queue.getByStatus(status, limit);
  }

  /**
   * Get jobs for a campaign
   */
  async getJobsByCampaign(campaignId: string): Promise<ScheduledJob[]> {
    return this.queue.getByCampaign(campaignId);
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
  async clearAll(): Promise<void> {
    await this.queue.clear();
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
