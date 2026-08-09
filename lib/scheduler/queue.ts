/**
 * Job Queue Implementation
 * In-memory queue for development, with interface for Redis/DB backends
 */

import prisma from '@/lib/db/prisma';
import { generateJobId as generateSecureJobId } from '@/lib/utils/id';
import { PrismaJobQueue, SchedulerQueueError } from './prisma-queue';
import type {
  ClaimedJobUpdate,
  JobQueue,
  ScheduledJob,
  JobStatus,
  ListJobsOptions,
  ListJobsResult,
} from './types';

const STORAGE_KEY = 'scheduler-jobs';

function sameIdempotentRequest(existing: ScheduledJob, candidate: ScheduledJob): boolean {
  return existing.requestFingerprint === candidate.requestFingerprint;
}

function findIdempotentJob(
  jobs: Map<string, ScheduledJob>,
  candidate: ScheduledJob
): ScheduledJob | undefined {
  return Array.from(jobs.values()).find(
    job => job.createdBy === candidate.createdBy && job.idempotencyKey === candidate.idempotencyKey
  );
}

function addToMemoryQueue(
  jobs: Map<string, ScheduledJob>,
  job: ScheduledJob
): { job: ScheduledJob; created: boolean } {
  const existing = findIdempotentJob(jobs, job);
  if (existing) {
    if (!sameIdempotentRequest(existing, job)) {
      throw new SchedulerQueueError(
        'IDEMPOTENCY_CONFLICT',
        'The idempotency key already identifies a different scheduler request'
      );
    }
    return { job: existing, created: false };
  }
  jobs.set(job.id, job);
  return { job, created: true };
}

/**
 * Load jobs from localStorage
 */
function loadFromStorage(): Map<string, ScheduledJob> {
  if (globalThis.window === undefined) {
    return new Map();
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const jobs: ScheduledJob[] = JSON.parse(stored);
      return new Map(jobs.map(job => [job.id, job]));
    }
  } catch (error) {
    console.error('Error loading jobs from storage:', error);
  }
  return new Map();
}

/**
 * Save jobs to localStorage
 */
function saveToStorage(jobs: Map<string, ScheduledJob>): void {
  if (globalThis.window === undefined) {
    return;
  }
  try {
    const jobArray = Array.from(jobs.values());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobArray));
  } catch (error) {
    console.error('Error saving jobs to storage:', error);
  }
}

/**
 * In-Memory Job Queue
 * Persists to localStorage for development
 */
export class InMemoryQueue implements JobQueue {
  private jobs: Map<string, ScheduledJob>;
  private initialized: boolean = false;

  constructor() {
    this.jobs = new Map();
  }

  private ensureInitialized(): void {
    if (!this.initialized && globalThis.window !== undefined) {
      this.jobs = loadFromStorage();
      this.initialized = true;
    }
  }

  private persist(): void {
    saveToStorage(this.jobs);
  }

  async add(job: ScheduledJob): Promise<{ job: ScheduledJob; created: boolean }> {
    this.ensureInitialized();
    const result = addToMemoryQueue(this.jobs, job);
    this.persist();
    return result;
  }

  async get(id: string, userId?: string): Promise<ScheduledJob | null> {
    this.ensureInitialized();
    const job = this.jobs.get(id);
    return job && (!userId || job.createdBy === userId) ? job : null;
  }

  async update(id: string, updates: Partial<ScheduledJob>): Promise<void> {
    this.ensureInitialized();
    const job = this.jobs.get(id);
    if (job) {
      this.jobs.set(id, {
        ...job,
        ...updates,
        updatedAt: new Date().toISOString(),
      });
      this.persist();
    }
  }

  async updateIfStatus(
    id: string,
    statuses: JobStatus[],
    updates: Partial<ScheduledJob>,
    userId?: string
  ): Promise<boolean> {
    this.ensureInitialized();
    const job = this.jobs.get(id);
    if (!job || (userId && job.createdBy !== userId) || !statuses.includes(job.status)) {
      return false;
    }
    this.jobs.set(id, { ...job, ...updates, updatedAt: new Date().toISOString() });
    this.persist();
    return true;
  }

  async remove(id: string): Promise<void> {
    this.ensureInitialized();
    this.jobs.delete(id);
    this.persist();
  }

  async getDueJobs(before: Date, limit: number): Promise<ScheduledJob[]> {
    this.ensureInitialized();
    const due: ScheduledJob[] = [];
    const beforeTime = before.getTime();

    for (const job of this.jobs.values()) {
      // Check if job is due
      const isDue =
        (job.status === 'scheduled' && new Date(job.scheduledTime).getTime() <= beforeTime) ||
        (job.status === 'failed' &&
          job.nextRetryAt &&
          new Date(job.nextRetryAt).getTime() <= beforeTime);

      if (isDue) {
        due.push(job);
        if (due.length >= limit) break;
      }
    }

    // Sort by scheduled time
    return due.sort(
      (a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
    );
  }

  async claimDueJobs(
    before: Date,
    limit: number,
    leaseToken: string,
    leaseExpiresAt: Date
  ): Promise<ScheduledJob[]> {
    this.ensureInitialized();
    for (const job of this.jobs.values()) {
      if (
        job.status === 'processing' &&
        job.leaseExpiresAt &&
        new Date(job.leaseExpiresAt) <= before
      ) {
        this.jobs.set(job.id, {
          ...job,
          status: job.attemptStartedAt
            ? 'reconciliation_required'
            : job.nextRetryAt
              ? 'failed'
              : 'scheduled',
          leaseToken: undefined,
          leaseExpiresAt: undefined,
          attemptStartedAt: undefined,
          error: job.attemptStartedAt
            ? 'Processing lease expired before the provider result was recorded'
            : 'Processing lease expired before a provider request started',
          updatedAt: before.toISOString(),
        });
      }
    }

    const candidates = await this.getDueJobs(before, limit * 4);
    const claimed: ScheduledJob[] = [];
    for (const candidate of candidates) {
      if (claimed.length >= limit) break;
      const current = this.jobs.get(candidate.id);
      if (!current || !['scheduled', 'failed'].includes(current.status)) continue;
      const updated: ScheduledJob = {
        ...current,
        status: 'processing',
        leaseToken,
        leaseExpiresAt: leaseExpiresAt.toISOString(),
        attemptStartedAt: undefined,
        updatedAt: before.toISOString(),
      };
      this.jobs.set(current.id, updated);
      claimed.push(updated);
    }
    this.persist();
    return claimed;
  }

  async markClaimAttempt(
    id: string,
    leaseToken: string,
    attemptedAt: Date
  ): Promise<ScheduledJob | null> {
    this.ensureInitialized();
    const current = this.jobs.get(id);
    if (!current || current.status !== 'processing' || current.leaseToken !== leaseToken) {
      return null;
    }
    const updated = {
      ...current,
      attempts: current.attempts + 1,
      lastAttemptAt: attemptedAt.toISOString(),
      attemptStartedAt: attemptedAt.toISOString(),
      updatedAt: attemptedAt.toISOString(),
    };
    this.jobs.set(id, updated);
    this.persist();
    return updated;
  }

  async renewClaimLease(id: string, leaseToken: string, leaseExpiresAt: Date): Promise<boolean> {
    this.ensureInitialized();
    const current = this.jobs.get(id);
    if (
      !current ||
      current.status !== 'processing' ||
      current.leaseToken !== leaseToken ||
      !current.attemptStartedAt
    ) {
      return false;
    }
    this.jobs.set(id, {
      ...current,
      leaseExpiresAt: leaseExpiresAt.toISOString(),
      updatedAt: new Date().toISOString(),
    });
    this.persist();
    return true;
  }

  async updateClaimed(id: string, leaseToken: string, updates: ClaimedJobUpdate): Promise<boolean> {
    this.ensureInitialized();
    const current = this.jobs.get(id);
    if (!current || current.status !== 'processing' || current.leaseToken !== leaseToken) {
      return false;
    }
    this.jobs.set(id, {
      ...current,
      ...updates,
      leaseToken: undefined,
      leaseExpiresAt: undefined,
      attemptStartedAt: undefined,
      updatedAt: new Date().toISOString(),
    });
    this.persist();
    return true;
  }

  async getByStatus(status: JobStatus, limit?: number, userId?: string): Promise<ScheduledJob[]> {
    this.ensureInitialized();
    const filtered: ScheduledJob[] = [];

    for (const job of this.jobs.values()) {
      if (job.status === status && (!userId || job.createdBy === userId)) {
        filtered.push(job);
        if (limit && filtered.length >= limit) break;
      }
    }

    return filtered.sort(
      (a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
    );
  }

  async getByCampaign(campaignId: string, userId?: string): Promise<ScheduledJob[]> {
    this.ensureInitialized();
    const filtered: ScheduledJob[] = [];

    for (const job of this.jobs.values()) {
      if (job.campaignId === campaignId && (!userId || job.createdBy === userId)) {
        filtered.push(job);
      }
    }

    return filtered.sort(
      (a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
    );
  }

  async getAll(userId?: string): Promise<ScheduledJob[]> {
    this.ensureInitialized();
    return Array.from(this.jobs.values())
      .filter(job => !userId || job.createdBy === userId)
      .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());
  }

  async list(options: ListJobsOptions): Promise<ListJobsResult> {
    const jobs = (await this.getAll(options.userId)).filter(
      job =>
        (!options.status || job.status === options.status) &&
        (!options.campaignId || job.campaignId === options.campaignId)
    );
    return { jobs: jobs.slice(options.offset, options.offset + options.limit), total: jobs.length };
  }

  async count(): Promise<number> {
    this.ensureInitialized();
    return this.jobs.size;
  }

  async clear(userId?: string): Promise<void> {
    if (userId) {
      for (const [id, job] of this.jobs.entries()) {
        if (job.createdBy === userId) this.jobs.delete(id);
      }
    } else {
      this.jobs.clear();
    }
    this.persist();
  }
}

// Server-side in-memory queue (no localStorage)
export class ServerMemoryQueue implements JobQueue {
  private readonly jobs: Map<string, ScheduledJob> = new Map();

  async add(job: ScheduledJob): Promise<{ job: ScheduledJob; created: boolean }> {
    return addToMemoryQueue(this.jobs, job);
  }

  async get(id: string, userId?: string): Promise<ScheduledJob | null> {
    const job = this.jobs.get(id);
    return job && (!userId || job.createdBy === userId) ? job : null;
  }

  async update(id: string, updates: Partial<ScheduledJob>): Promise<void> {
    const job = this.jobs.get(id);
    if (job) {
      this.jobs.set(id, {
        ...job,
        ...updates,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  async updateIfStatus(
    id: string,
    statuses: JobStatus[],
    updates: Partial<ScheduledJob>,
    userId?: string
  ): Promise<boolean> {
    const job = this.jobs.get(id);
    if (!job || (userId && job.createdBy !== userId) || !statuses.includes(job.status)) {
      return false;
    }
    this.jobs.set(id, { ...job, ...updates, updatedAt: new Date().toISOString() });
    return true;
  }

  async remove(id: string): Promise<void> {
    this.jobs.delete(id);
  }

  async getDueJobs(before: Date, limit: number): Promise<ScheduledJob[]> {
    const due: ScheduledJob[] = [];
    const beforeTime = before.getTime();

    for (const job of this.jobs.values()) {
      const isDue =
        (job.status === 'scheduled' && new Date(job.scheduledTime).getTime() <= beforeTime) ||
        (job.status === 'failed' &&
          job.nextRetryAt &&
          new Date(job.nextRetryAt).getTime() <= beforeTime);

      if (isDue) {
        due.push(job);
        if (due.length >= limit) break;
      }
    }

    return due.sort(
      (a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
    );
  }

  async claimDueJobs(
    before: Date,
    limit: number,
    leaseToken: string,
    leaseExpiresAt: Date
  ): Promise<ScheduledJob[]> {
    for (const job of this.jobs.values()) {
      if (
        job.status === 'processing' &&
        job.leaseExpiresAt &&
        new Date(job.leaseExpiresAt) <= before
      ) {
        this.jobs.set(job.id, {
          ...job,
          status: job.attemptStartedAt
            ? 'reconciliation_required'
            : job.nextRetryAt
              ? 'failed'
              : 'scheduled',
          leaseToken: undefined,
          leaseExpiresAt: undefined,
          attemptStartedAt: undefined,
          error: job.attemptStartedAt
            ? 'Processing lease expired before the provider result was recorded'
            : 'Processing lease expired before a provider request started',
          updatedAt: before.toISOString(),
        });
      }
    }

    const candidates = await this.getDueJobs(before, limit * 4);
    const claimed: ScheduledJob[] = [];
    for (const candidate of candidates) {
      if (claimed.length >= limit) break;
      const current = this.jobs.get(candidate.id);
      if (!current || !['scheduled', 'failed'].includes(current.status)) continue;
      const updated: ScheduledJob = {
        ...current,
        status: 'processing',
        leaseToken,
        leaseExpiresAt: leaseExpiresAt.toISOString(),
        attemptStartedAt: undefined,
        updatedAt: before.toISOString(),
      };
      this.jobs.set(current.id, updated);
      claimed.push(updated);
    }
    return claimed;
  }

  async markClaimAttempt(
    id: string,
    leaseToken: string,
    attemptedAt: Date
  ): Promise<ScheduledJob | null> {
    const current = this.jobs.get(id);
    if (!current || current.status !== 'processing' || current.leaseToken !== leaseToken) {
      return null;
    }
    const updated = {
      ...current,
      attempts: current.attempts + 1,
      lastAttemptAt: attemptedAt.toISOString(),
      attemptStartedAt: attemptedAt.toISOString(),
      updatedAt: attemptedAt.toISOString(),
    };
    this.jobs.set(id, updated);
    return updated;
  }

  async renewClaimLease(id: string, leaseToken: string, leaseExpiresAt: Date): Promise<boolean> {
    const current = this.jobs.get(id);
    if (
      !current ||
      current.status !== 'processing' ||
      current.leaseToken !== leaseToken ||
      !current.attemptStartedAt
    ) {
      return false;
    }
    this.jobs.set(id, {
      ...current,
      leaseExpiresAt: leaseExpiresAt.toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return true;
  }

  async updateClaimed(id: string, leaseToken: string, updates: ClaimedJobUpdate): Promise<boolean> {
    const current = this.jobs.get(id);
    if (!current || current.status !== 'processing' || current.leaseToken !== leaseToken) {
      return false;
    }
    this.jobs.set(id, {
      ...current,
      ...updates,
      leaseToken: undefined,
      leaseExpiresAt: undefined,
      attemptStartedAt: undefined,
      updatedAt: new Date().toISOString(),
    });
    return true;
  }

  async getByStatus(status: JobStatus, limit?: number, userId?: string): Promise<ScheduledJob[]> {
    const filtered: ScheduledJob[] = [];

    for (const job of this.jobs.values()) {
      if (job.status === status && (!userId || job.createdBy === userId)) {
        filtered.push(job);
        if (limit && filtered.length >= limit) break;
      }
    }

    return filtered.sort(
      (a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
    );
  }

  async getByCampaign(campaignId: string, userId?: string): Promise<ScheduledJob[]> {
    const filtered: ScheduledJob[] = [];

    for (const job of this.jobs.values()) {
      if (job.campaignId === campaignId && (!userId || job.createdBy === userId)) {
        filtered.push(job);
      }
    }

    return filtered.sort(
      (a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
    );
  }

  async getAll(userId?: string): Promise<ScheduledJob[]> {
    return Array.from(this.jobs.values()).filter(job => !userId || job.createdBy === userId);
  }

  async list(options: ListJobsOptions): Promise<ListJobsResult> {
    const jobs = (await this.getAll(options.userId))
      .filter(
        job =>
          (!options.status || job.status === options.status) &&
          (!options.campaignId || job.campaignId === options.campaignId)
      )
      .sort((a, b) => new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime());
    return { jobs: jobs.slice(options.offset, options.offset + options.limit), total: jobs.length };
  }

  async count(): Promise<number> {
    return this.jobs.size;
  }

  async clear(userId?: string): Promise<void> {
    if (userId) {
      for (const [id, job] of this.jobs.entries()) {
        if (job.createdBy === userId) this.jobs.delete(id);
      }
    } else {
      this.jobs.clear();
    }
  }
}

// Singleton instances
let clientQueue: InMemoryQueue | null = null;
let serverQueue: ServerMemoryQueue | null = null;
let durableQueue: PrismaJobQueue | null = null;

/**
 * Get the appropriate queue instance
 */
export function getQueue(): JobQueue {
  if (globalThis.window === undefined) {
    if (prisma) {
      durableQueue ??= new PrismaJobQueue(prisma);
      return durableQueue;
    }
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Durable scheduler persistence is not configured');
    }
    serverQueue ??= new ServerMemoryQueue();
    return serverQueue;
  }
  // Client-side: use localStorage-backed queue
  clientQueue ??= new InMemoryQueue();
  return clientQueue;
}

/**
 * Generate unique job ID
 * NOTE: Uses Math.random() intentionally - these IDs are for internal job
 * queue management only, not security-sensitive operations. The timestamp
 * prefix ensures uniqueness for practical purposes.
 */
export function generateJobId(): string {
  return generateSecureJobId();
}
