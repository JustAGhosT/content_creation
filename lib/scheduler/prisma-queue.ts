import type { Prisma, PrismaClient, SchedulerJob as StoredSchedulerJob } from '@prisma/client';
import { z } from 'zod';
import type {
  ClaimedJobUpdate,
  JobQueue,
  JobStatus,
  ScheduledJob,
  ListJobsOptions,
  ListJobsResult,
} from './types';

export interface CampaignPublishAuditInput {
  campaignId: string;
  campaignVersionId: string;
  contentId: string;
  variantId: string;
  platformId: string;
  contentHash: string;
  requestedBy: string;
}

const jobStatusSchema = z.enum([
  'pending',
  'scheduled',
  'processing',
  'published',
  'failed',
  'dead',
  'reconciliation_required',
  'cancelled',
]);

const jobTypeSchema = z.enum(['campaign_post', 'series_promotion', 'standalone']);

const contentSchema = z.object({
  text: z.string(),
  mediaUrls: z.array(z.string()).optional(),
  hashtags: z.array(z.string()).optional(),
  mentions: z.array(z.string()).optional(),
  tiktokPrivacyLevel: z.string().optional(),
  isThread: z.boolean().optional(),
  threadParts: z
    .array(
      z.object({
        order: z.number().int(),
        text: z.string(),
        mediaUrls: z.array(z.string()).optional(),
      })
    )
    .optional(),
});

export class SchedulerQueueError extends Error {
  constructor(
    readonly code: 'TENANT_REQUIRED' | 'IDEMPOTENCY_CONFLICT' | 'CORRUPT_JOB',
    message: string
  ) {
    super(message);
    this.name = 'SchedulerQueueError';
  }
}

function parseStoredJob(row: StoredSchedulerJob): ScheduledJob {
  try {
    return {
      id: row.id,
      idempotencyKey: row.idempotencyKey,
      requestFingerprint: row.requestFingerprint,
      type: jobTypeSchema.parse(row.type),
      campaignId: row.campaignId ?? undefined,
      campaignVersion: row.campaignVersion ?? undefined,
      campaignVersionId: row.campaignVersionId ?? undefined,
      approvedContentHash: row.approvedContentHash ?? undefined,
      variantId: row.variantId ?? undefined,
      contentId: row.contentId,
      platformId: row.platformId,
      content: contentSchema.parse(JSON.parse(row.content)),
      scheduledTime: row.scheduledAt.toISOString(),
      timezone: row.timezone,
      status: jobStatusSchema.parse(row.status),
      attempts: row.attempts,
      maxAttempts: row.maxAttempts,
      lastAttemptAt: row.lastAttemptAt?.toISOString(),
      nextRetryAt: row.nextRetryAt?.toISOString(),
      leaseToken: row.leaseToken ?? undefined,
      leaseExpiresAt: row.leaseExpiresAt?.toISOString(),
      attemptStartedAt: row.attemptStartedAt?.toISOString(),
      publishedAt: row.publishedAt?.toISOString(),
      publishedUrl: row.publishedUrl ?? undefined,
      platformPostId: row.platformPostId ?? undefined,
      error: row.error ?? undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      createdBy: row.userId,
    };
  } catch (error) {
    throw new SchedulerQueueError(
      'CORRUPT_JOB',
      `Scheduler job ${row.id} could not be decoded: ${error instanceof Error ? error.message : 'invalid data'}`
    );
  }
}

function createData(job: ScheduledJob): Prisma.SchedulerJobUncheckedCreateInput {
  if (!job.createdBy) {
    throw new SchedulerQueueError('TENANT_REQUIRED', 'Durable scheduler jobs require an owner');
  }
  return {
    id: job.id,
    userId: job.createdBy,
    idempotencyKey: job.idempotencyKey,
    requestFingerprint: job.requestFingerprint,
    type: job.type,
    campaignId: job.campaignId,
    campaignVersion: job.campaignVersion,
    campaignVersionId: job.campaignVersionId,
    approvedContentHash: job.approvedContentHash,
    variantId: job.variantId,
    contentId: job.contentId,
    platformId: job.platformId,
    content: JSON.stringify(job.content),
    scheduledAt: new Date(job.scheduledTime),
    timezone: job.timezone,
    status: job.status,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    lastAttemptAt: job.lastAttemptAt ? new Date(job.lastAttemptAt) : undefined,
    nextRetryAt: job.nextRetryAt ? new Date(job.nextRetryAt) : undefined,
    leaseToken: job.leaseToken,
    leaseExpiresAt: job.leaseExpiresAt ? new Date(job.leaseExpiresAt) : undefined,
    attemptStartedAt: job.attemptStartedAt ? new Date(job.attemptStartedAt) : undefined,
    publishedAt: job.publishedAt ? new Date(job.publishedAt) : undefined,
    publishedUrl: job.publishedUrl,
    platformPostId: job.platformPostId,
    error: job.error,
    createdAt: new Date(job.createdAt),
    updatedAt: new Date(job.updatedAt),
  };
}

function sameIdempotentRequest(row: StoredSchedulerJob, job: ScheduledJob): boolean {
  return row.requestFingerprint === job.requestFingerprint;
}

function hasOwn<T extends object>(value: T, key: keyof T): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function updateData(updates: Partial<ScheduledJob>): Prisma.SchedulerJobUncheckedUpdateInput {
  const data: Prisma.SchedulerJobUncheckedUpdateInput = {};
  if (hasOwn(updates, 'status')) data.status = updates.status;
  if (hasOwn(updates, 'scheduledTime')) {
    data.scheduledAt = updates.scheduledTime ? new Date(updates.scheduledTime) : undefined;
  }
  if (hasOwn(updates, 'attempts')) data.attempts = updates.attempts;
  if (hasOwn(updates, 'lastAttemptAt')) {
    data.lastAttemptAt = updates.lastAttemptAt ? new Date(updates.lastAttemptAt) : null;
  }
  if (hasOwn(updates, 'nextRetryAt')) {
    data.nextRetryAt = updates.nextRetryAt ? new Date(updates.nextRetryAt) : null;
  }
  if (hasOwn(updates, 'leaseToken')) data.leaseToken = updates.leaseToken ?? null;
  if (hasOwn(updates, 'leaseExpiresAt')) {
    data.leaseExpiresAt = updates.leaseExpiresAt ? new Date(updates.leaseExpiresAt) : null;
  }
  if (hasOwn(updates, 'attemptStartedAt')) {
    data.attemptStartedAt = updates.attemptStartedAt ? new Date(updates.attemptStartedAt) : null;
  }
  if (hasOwn(updates, 'publishedAt')) {
    data.publishedAt = updates.publishedAt ? new Date(updates.publishedAt) : null;
  }
  if (hasOwn(updates, 'publishedUrl')) data.publishedUrl = updates.publishedUrl ?? null;
  if (hasOwn(updates, 'platformPostId')) data.platformPostId = updates.platformPostId ?? null;
  if (hasOwn(updates, 'error')) data.error = updates.error ?? null;
  if (hasOwn(updates, 'content')) data.content = JSON.stringify(updates.content);
  if (hasOwn(updates, 'timezone')) data.timezone = updates.timezone;
  if (hasOwn(updates, 'maxAttempts')) data.maxAttempts = updates.maxAttempts;
  return data;
}

export class PrismaJobQueue implements JobQueue {
  constructor(private readonly client: PrismaClient) {}

  private async addUsing(
    client: PrismaClient | Prisma.TransactionClient,
    job: ScheduledJob
  ): Promise<{ job: ScheduledJob; created: boolean }> {
    if (!job.createdBy) {
      throw new SchedulerQueueError('TENANT_REQUIRED', 'Durable scheduler jobs require an owner');
    }
    const existing = await client.schedulerJob.findUnique({
      where: {
        userId_idempotencyKey: {
          userId: job.createdBy,
          idempotencyKey: job.idempotencyKey,
        },
      },
    });
    if (existing) {
      if (!sameIdempotentRequest(existing, job)) {
        throw new SchedulerQueueError(
          'IDEMPOTENCY_CONFLICT',
          'The idempotency key already identifies a different scheduler request'
        );
      }
      return { job: parseStoredJob(existing), created: false };
    }

    const persisted = await client.schedulerJob.upsert({
      where: {
        userId_idempotencyKey: {
          userId: job.createdBy,
          idempotencyKey: job.idempotencyKey,
        },
      },
      create: createData(job),
      update: {},
    });
    if (!sameIdempotentRequest(persisted, job)) {
      throw new SchedulerQueueError(
        'IDEMPOTENCY_CONFLICT',
        'The idempotency key already identifies a different scheduler request'
      );
    }
    return { job: parseStoredJob(persisted), created: persisted.id === job.id };
  }

  async add(job: ScheduledJob): Promise<{ job: ScheduledJob; created: boolean }> {
    return this.addUsing(this.client, job);
  }

  async addCampaignJob(
    job: ScheduledJob,
    audit: CampaignPublishAuditInput
  ): Promise<{ job: ScheduledJob; created: boolean }> {
    if (
      job.createdBy !== audit.requestedBy ||
      job.campaignId !== audit.campaignId ||
      job.campaignVersionId !== audit.campaignVersionId ||
      job.contentId !== audit.contentId ||
      job.variantId !== audit.variantId ||
      job.platformId !== audit.platformId ||
      job.approvedContentHash !== audit.contentHash
    ) {
      throw new SchedulerQueueError(
        'IDEMPOTENCY_CONFLICT',
        'Campaign audit binding does not match the scheduler request'
      );
    }

    return this.client.$transaction(async transaction => {
      const persisted = await this.addUsing(transaction, job);
      await transaction.publishAttempt.upsert({
        where: { schedulerJobId: persisted.job.id },
        create: {
          campaignId: audit.campaignId,
          campaignVersionId: audit.campaignVersionId,
          contentId: audit.contentId,
          variantId: audit.variantId,
          platformId: audit.platformId,
          contentHash: audit.contentHash,
          requestedBy: audit.requestedBy,
          schedulerJobId: persisted.job.id,
        },
        update: {},
      });
      return persisted;
    });
  }

  async get(id: string, userId?: string): Promise<ScheduledJob | null> {
    const row = await this.client.schedulerJob.findFirst({ where: { id, userId } });
    return row ? parseStoredJob(row) : null;
  }

  async update(id: string, updates: Partial<ScheduledJob>): Promise<void> {
    await this.client.schedulerJob.updateMany({ where: { id }, data: updateData(updates) });
  }

  async updateIfStatus(
    id: string,
    statuses: JobStatus[],
    updates: Partial<ScheduledJob>,
    userId?: string
  ): Promise<boolean> {
    const result = await this.client.schedulerJob.updateMany({
      where: { id, userId, status: { in: statuses } },
      data: updateData(updates),
    });
    return result.count === 1;
  }

  async remove(id: string): Promise<void> {
    await this.client.schedulerJob.deleteMany({ where: { id } });
  }

  async getDueJobs(before: Date, limit: number): Promise<ScheduledJob[]> {
    const rows = await this.client.schedulerJob.findMany({
      where: {
        OR: [
          { status: 'scheduled', scheduledAt: { lte: before } },
          { status: 'failed', nextRetryAt: { lte: before } },
        ],
      },
      orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'asc' }],
      take: limit,
    });
    return rows.map(parseStoredJob);
  }

  async claimDueJobs(
    before: Date,
    limit: number,
    leaseToken: string,
    leaseExpiresAt: Date
  ): Promise<ScheduledJob[]> {
    await this.client.schedulerJob.updateMany({
      where: {
        status: 'processing',
        leaseExpiresAt: { lte: before },
        attemptStartedAt: null,
        nextRetryAt: null,
      },
      data: {
        status: 'scheduled',
        leaseToken: null,
        leaseExpiresAt: null,
        errorCode: 'LEASE_EXPIRED_BEFORE_ATTEMPT',
        error: 'Processing lease expired before a provider request started',
      },
    });
    await this.client.schedulerJob.updateMany({
      where: {
        status: 'processing',
        leaseExpiresAt: { lte: before },
        attemptStartedAt: null,
        nextRetryAt: { not: null },
      },
      data: {
        status: 'failed',
        leaseToken: null,
        leaseExpiresAt: null,
        errorCode: 'LEASE_EXPIRED_BEFORE_ATTEMPT',
        error: 'Processing lease expired before a provider request started',
      },
    });
    await this.client.schedulerJob.updateMany({
      where: {
        status: 'processing',
        leaseExpiresAt: { lte: before },
        attemptStartedAt: { not: null },
      },
      data: {
        status: 'reconciliation_required',
        leaseToken: null,
        leaseExpiresAt: null,
        errorCode: 'LEASE_EXPIRED_UNKNOWN_RESULT',
        error: 'Processing lease expired before the provider result was recorded',
      },
    });

    const candidates = await this.client.schedulerJob.findMany({
      where: {
        OR: [
          { status: 'scheduled', scheduledAt: { lte: before } },
          { status: 'failed', nextRetryAt: { lte: before } },
        ],
      },
      orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'asc' }],
      take: Math.max(limit * 4, limit),
    });

    const claimed: ScheduledJob[] = [];
    for (const candidate of candidates) {
      if (claimed.length >= limit) break;
      const dueGuard =
        candidate.status === 'scheduled'
          ? { id: candidate.id, status: 'scheduled', scheduledAt: { lte: before } }
          : { id: candidate.id, status: 'failed', nextRetryAt: { lte: before } };
      const claim = await this.client.schedulerJob.updateMany({
        where: dueGuard,
        data: {
          status: 'processing',
          leaseToken,
          leaseExpiresAt,
          attemptStartedAt: null,
          errorCode: null,
          error: null,
        },
      });
      if (claim.count !== 1) continue;
      const row = await this.client.schedulerJob.findUnique({ where: { id: candidate.id } });
      if (row) claimed.push(parseStoredJob(row));
    }
    return claimed;
  }

  async markClaimAttempt(
    id: string,
    leaseToken: string,
    attemptedAt: Date
  ): Promise<ScheduledJob | null> {
    const result = await this.client.schedulerJob.updateMany({
      where: { id, status: 'processing', leaseToken },
      data: {
        attempts: { increment: 1 },
        lastAttemptAt: attemptedAt,
        attemptStartedAt: attemptedAt,
      },
    });
    if (result.count !== 1) return null;
    const row = await this.client.schedulerJob.findFirst({
      where: { id, status: 'processing', leaseToken },
    });
    return row ? parseStoredJob(row) : null;
  }

  async renewClaimLease(id: string, leaseToken: string, leaseExpiresAt: Date): Promise<boolean> {
    const result = await this.client.schedulerJob.updateMany({
      where: {
        id,
        status: 'processing',
        leaseToken,
        attemptStartedAt: { not: null },
      },
      data: { leaseExpiresAt },
    });
    return result.count === 1;
  }

  async updateClaimed(id: string, leaseToken: string, updates: ClaimedJobUpdate): Promise<boolean> {
    const result = await this.client.schedulerJob.updateMany({
      where: { id, status: 'processing', leaseToken },
      data: {
        ...updateData(updates),
        leaseToken: null,
        leaseExpiresAt: null,
        attemptStartedAt: null,
      },
    });
    return result.count === 1;
  }

  async getByStatus(status: JobStatus, limit?: number, userId?: string): Promise<ScheduledJob[]> {
    const rows = await this.client.schedulerJob.findMany({
      where: { status, userId },
      orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'asc' }],
      take: limit,
    });
    return rows.map(parseStoredJob);
  }

  async getByCampaign(campaignId: string, userId?: string): Promise<ScheduledJob[]> {
    const rows = await this.client.schedulerJob.findMany({
      where: { campaignId, userId },
      orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map(parseStoredJob);
  }

  async getAll(userId?: string): Promise<ScheduledJob[]> {
    const rows = await this.client.schedulerJob.findMany({
      where: { userId },
      orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map(parseStoredJob);
  }

  async list(options: ListJobsOptions): Promise<ListJobsResult> {
    const where = {
      userId: options.userId,
      status: options.status,
      campaignId: options.campaignId,
    };
    const [rows, total] = await this.client.$transaction([
      this.client.schedulerJob.findMany({
        where,
        orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'asc' }],
        skip: options.offset,
        take: options.limit,
      }),
      this.client.schedulerJob.count({ where }),
    ]);
    return { jobs: rows.map(parseStoredJob), total };
  }

  async count(): Promise<number> {
    return this.client.schedulerJob.count();
  }

  async clear(userId?: string): Promise<void> {
    if (!userId) {
      throw new SchedulerQueueError(
        'TENANT_REQUIRED',
        'Durable scheduler cleanup requires an owner'
      );
    }
    await this.client.schedulerJob.deleteMany({ where: { userId } });
  }
}
