/**
 * Render Job Lifecycle Manager
 * Implements atomic idempotency, worker lease fencing, artifact reuse, and reconciliation per ADR 0001.
 */

import {
  deriveRenderRequestFingerprint,
  type CreativeRenderer,
  type RenderJob,
  type RenderRequest,
} from './contracts';

export class RenderJobManager {
  private readonly jobs: Map<string, RenderJob> = new Map(); // Key: `${tenantId}:${idempotencyKey}`
  private readonly jobsById: Map<string, RenderJob> = new Map();

  /**
   * Atomically creates a new RenderJob or returns an existing one for idempotent replay/reuse.
   */
  public createOrReuseJob(
    tenantId: string,
    idempotencyKey: string,
    request: RenderRequest
  ): { job: RenderJob; isNew: boolean; isReused: boolean } {
    const key = `${tenantId}:${idempotencyKey}`;
    const fingerprint = deriveRenderRequestFingerprint({
      contractVersion: request.contractVersion,
      canonicalInputHash: request.canonicalInputHash,
      templateVersionId: request.templateVersionId,
      variantVersionId: request.variantVersionId,
      assetContentHashes: request.assetContentHashes,
      target: request.target,
    });

    const existing = this.jobs.get(key);
    if (existing) {
      // Idempotency Conflict Check: same key with different fingerprint fails closed
      if (existing.requestFingerprint !== fingerprint) {
        const error = new Error(
          `Idempotency conflict: key "${idempotencyKey}" was already used with a different request fingerprint.`
        );
        Object.assign(error, { code: 'FINGERPRINT_CONFLICT' });
        throw error;
      }

      // Successful Artifact Reuse: if the job already succeeded, return it immediately
      if (existing.status === 'succeeded' && existing.artifactHash) {
        return { job: existing, isNew: false, isReused: true };
      }

      return { job: existing, isNew: false, isReused: false };
    }

    const newJob: RenderJob = {
      id: request.renderJobId,
      tenantId,
      idempotencyKey,
      requestFingerprint: fingerprint,
      status: 'requested',
      attemptCount: 0,
      maxAttempts: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.jobs.set(key, newJob);
    this.jobsById.set(newJob.id, newJob);

    return { job: newJob, isNew: true, isReused: false };
  }

  /**
   * Claims a job atomically with a unique worker lease token.
   */
  public acquireLease(jobId: string, workerToken: string, leaseDurationMs = 30000): RenderJob {
    const job = this.jobsById.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const now = Date.now();
    if (
      job.status === 'running' &&
      job.leaseExpiresAt &&
      new Date(job.leaseExpiresAt).getTime() > now
    ) {
      if (job.leaseToken !== workerToken) {
        throw new Error(
          `Job ${jobId} is currently leased to another worker until ${job.leaseExpiresAt}`
        );
      }
    }

    if (job.status === 'escalated' || job.status === 'succeeded' || job.status === 'cancelled') {
      throw new Error(`Cannot acquire lease on job in terminal status ${job.status}`);
    }

    job.status = 'running';
    job.leaseToken = workerToken;
    job.leaseExpiresAt = new Date(now + leaseDurationMs).toISOString();
    job.lastHeartbeatAt = new Date(now).toISOString();
    job.attemptCount += 1;
    job.updatedAt = new Date(now).toISOString();

    return job;
  }

  /**
   * Heartbeats a lease to prevent expiration during long operations.
   */
  public heartbeatLease(jobId: string, workerToken: string, extendMs = 30000): RenderJob {
    const job = this.jobsById.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    if (job.leaseToken !== workerToken) {
      throw new Error(`Stale worker fencing: lease token mismatch on job ${jobId}`);
    }

    const now = Date.now();
    job.leaseExpiresAt = new Date(now + extendMs).toISOString();
    job.lastHeartbeatAt = new Date(now).toISOString();
    job.updatedAt = new Date(now).toISOString();

    return job;
  }

  /**
   * Dispatches a leased job to the CreativeRenderer.
   */
  public async dispatchJob(
    jobId: string,
    workerToken: string,
    renderer: CreativeRenderer,
    request: RenderRequest
  ): Promise<RenderJob> {
    const job = this.jobsById.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    // Worker fencing check
    if (job.leaseToken !== workerToken) {
      throw new Error(`Worker fencing violation: stale token ${workerToken} on job ${jobId}`);
    }

    job.millAttemptReference = `mill-req-${job.id}-att-${job.attemptCount}`;
    job.rendererVersion = `${renderer.name}@${renderer.version}`;

    try {
      const result = await renderer.render(request);

      if (result.status === 'succeeded') {
        job.status = 'succeeded';
        job.artifactHash = result.artifactHash;
        job.artifactStorageReference = result.artifactStorageReference;
        job.leaseToken = undefined;
        job.leaseExpiresAt = undefined;
        job.updatedAt = new Date().toISOString();
        return job;
      }

      if (result.errorCode === 'RECONCILIATION_REQUIRED') {
        job.status = 'reconciling';
        job.errorCode = result.errorCode;
        job.errorMessage = result.errorMessage;
        job.leaseToken = undefined;
        job.leaseExpiresAt = undefined;
        job.updatedAt = new Date().toISOString();
        return job;
      }

      job.status = 'failed';
      job.errorCode = result.errorCode;
      job.errorMessage = result.errorMessage;
      job.leaseToken = undefined;
      job.leaseExpiresAt = undefined;
      job.updatedAt = new Date().toISOString();
      return job;
    } catch (err: unknown) {
      job.status = 'failed';
      job.errorMessage = err instanceof Error ? err.message : 'Unknown render exception';
      job.leaseToken = undefined;
      job.leaseExpiresAt = undefined;
      job.updatedAt = new Date().toISOString();
      return job;
    }
  }

  /**
   * Reconciles unknown outcomes or transitions to escalated if unresolved.
   */
  public reconcileJob(jobId: string, verifiedArtifactHash?: string): RenderJob {
    const job = this.jobsById.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    if (job.status !== 'reconciling') {
      return job;
    }

    if (verifiedArtifactHash) {
      job.status = 'succeeded';
      job.artifactHash = verifiedArtifactHash;
      job.artifactStorageReference = `artifacts/creative/reconciled/${verifiedArtifactHash}`;
      job.updatedAt = new Date().toISOString();
      return job;
    }

    // If unresolved during reconciliation, escalate to operator
    return this.escalateJob(
      jobId,
      'Reconciliation deadline passed without verified artifact receipt.'
    );
  }

  /**
   * Atomically transitions a job into terminal escalated state.
   */
  public escalateJob(jobId: string, reason: string): RenderJob {
    const job = this.jobsById.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    job.status = 'escalated';
    job.escalatedAt = new Date().toISOString();
    job.escalationReason = reason;
    job.leaseToken = undefined;
    job.leaseExpiresAt = undefined;
    job.updatedAt = new Date().toISOString();

    return job;
  }

  public getJob(jobId: string): RenderJob | undefined {
    return this.jobsById.get(jobId);
  }
}

export const renderJobManager = new RenderJobManager();
