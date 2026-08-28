/**
 * Contract & Integration Tests for Mill Renderer Adapter and Job Lifecycle
 * Implements ADR 0001 requirements for Mill boundary, request fingerprints, idempotency, and reconciliation.
 */

import {
  deriveRenderRequestFingerprint,
  type RenderRequest,
} from '@/lib/creative/renderer/contracts';
import { MillRendererAdapter } from '@/lib/creative/renderer/mill-adapter';
import { RenderJobManager } from '@/lib/creative/renderer/render-job-manager';
import type { SlotValue, TargetOutputSpecification } from '@/lib/creative/types';

describe('Mill Renderer Adapter and Render Job Lifecycle', () => {
  let adapter: MillRendererAdapter;
  let jobManager: RenderJobManager;

  const validTarget: TargetOutputSpecification = {
    platform: 'instagram',
    mediaType: 'image/png',
    dimensions: {
      width: 1080,
      height: 1080,
      unit: 'px',
      dpi: 72,
    },
    colorProfile: 'sRGB',
    quality: 90,
  };

  const validSlots: Record<string, SlotValue> = {
    'slot-headline': {
      type: 'text',
      content: 'Official Product Announcement 2026',
    },
    'slot-logo': {
      type: 'logo',
      assetId: 'asset-logo-1',
      assetHash: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      altText: 'Company Logo',
    },
  };

  const sampleRequest: RenderRequest = {
    contractVersion: 'v1',
    renderJobId: 'job-100',
    idempotencyKey: 'idem-key-abc',
    canonicalInputHash: 'sha256:1111111111111111111111111111111111111111111111111111111111111111',
    templateVersionId: 'tmpl-social-flyer-v1',
    variantVersionId: 'crv-variant-1-v1',
    assetContentHashes: ['sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'],
    assetGrants: {
      'asset-logo-1': {
        assetId: 'asset-logo-1',
        contentHash: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        grantToken: 'grant-token-xyz-secret-1',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        mediaType: 'image/png',
      },
    },
    resolvedSlots: validSlots,
    target: validTarget,
    correlationId: 'trace-correlation-001',
    deadline: new Date(Date.now() + 60000).toISOString(),
  };

  beforeEach(() => {
    adapter = new MillRendererAdapter();
    jobManager = new RenderJobManager();
  });

  describe('Request Fingerprint Invariance and Variance', () => {
    it('generates identical fingerprint when operational IDs or asset grant tokens change', () => {
      const baseFingerprint = deriveRenderRequestFingerprint({
        contractVersion: sampleRequest.contractVersion,
        canonicalInputHash: sampleRequest.canonicalInputHash,
        templateVersionId: sampleRequest.templateVersionId,
        variantVersionId: sampleRequest.variantVersionId,
        assetContentHashes: sampleRequest.assetContentHashes,
        target: sampleRequest.target,
      });

      // Simulated grant rotation and operational ID update (deadline, correlation, job ID)
      const rotatedRequest: RenderRequest = {
        ...sampleRequest,
        renderJobId: 'job-999-different-id',
        idempotencyKey: 'idem-key-new',
        correlationId: 'trace-new-different-session',
        deadline: new Date(Date.now() + 120000).toISOString(),
        assetGrants: {
          'asset-logo-1': {
            ...sampleRequest.assetGrants['asset-logo-1'],
            grantToken: 'grant-token-ROTATED-NEW-VALUE',
            expiresAt: new Date(Date.now() + 7200000).toISOString(),
          },
        },
      };

      const rotatedFingerprint = deriveRenderRequestFingerprint({
        contractVersion: rotatedRequest.contractVersion,
        canonicalInputHash: rotatedRequest.canonicalInputHash,
        templateVersionId: rotatedRequest.templateVersionId,
        variantVersionId: rotatedRequest.variantVersionId,
        assetContentHashes: rotatedRequest.assetContentHashes,
        target: rotatedRequest.target,
      });

      expect(rotatedFingerprint).toBe(baseFingerprint);
      expect(rotatedFingerprint).toMatch(/^sha256:[a-f0-9]{64}$/);
    });

    it('changes fingerprint when canonicalInputHash or target dimensions change', () => {
      const baseFingerprint = deriveRenderRequestFingerprint({
        contractVersion: sampleRequest.contractVersion,
        canonicalInputHash: sampleRequest.canonicalInputHash,
        templateVersionId: sampleRequest.templateVersionId,
        variantVersionId: sampleRequest.variantVersionId,
        assetContentHashes: sampleRequest.assetContentHashes,
        target: sampleRequest.target,
      });

      const modifiedTargetSpec: TargetOutputSpecification = {
        ...validTarget,
        dimensions: {
          ...validTarget.dimensions,
          width: 1200, // modified width
        },
      };

      const modifiedFingerprint = deriveRenderRequestFingerprint({
        contractVersion: sampleRequest.contractVersion,
        canonicalInputHash: sampleRequest.canonicalInputHash,
        templateVersionId: sampleRequest.templateVersionId,
        variantVersionId: sampleRequest.variantVersionId,
        assetContentHashes: sampleRequest.assetContentHashes,
        target: modifiedTargetSpec,
      });

      expect(modifiedFingerprint).not.toBe(baseFingerprint);
    });
  });

  describe('Mill Adapter Validation and Security Rules', () => {
    it('executes successful deterministic rendering and returns artifact hash', async () => {
      const result = await adapter.render(sampleRequest);

      expect(result.status).toBe('succeeded');
      expect(result.rendererName).toBe('mill');
      expect(result.artifactHash).toMatch(/^sha256:[a-f0-9]{64}$/);
      expect(result.artifactStorageReference).toContain(sampleRequest.templateVersionId);
      expect(result.dimensions?.width).toBe(1080);
    });

    it('rejects request with expired deadline before execution', async () => {
      const expiredRequest: RenderRequest = {
        ...sampleRequest,
        deadline: new Date(Date.now() - 1000).toISOString(), // Expired in the past
      };

      const result = await adapter.render(expiredRequest);

      expect(result.status).toBe('failed');
      expect(result.errorCode).toBe('DEADLINE_EXCEEDED');
      expect(result.errorMessage).toContain('deadline has expired');
    });

    it('rejects request when asset grant is missing or expired', async () => {
      const missingGrantRequest: RenderRequest = {
        ...sampleRequest,
        assetGrants: {}, // Empty grants
      };

      const result = await adapter.render(missingGrantRequest);

      expect(result.status).toBe('failed');
      expect(result.errorCode).toBe('ASSET_HASH_MISMATCH');
      expect(result.errorMessage).toContain('No valid grant provided');
    });

    it('rejects negative vector where claimed hash is invalid', async () => {
      const forgedHashRequest: RenderRequest = {
        ...sampleRequest,
        canonicalInputHash:
          'sha256:0000000000000000000000000000000000000000000000000000000000000000',
      };

      const result = await adapter.render(forgedHashRequest);

      expect(result.status).toBe('failed');
      expect(result.errorCode).toBe('INVALID_INPUT_HASH');
      expect(result.errorMessage).toContain('Claimed canonical input hash does not match');
    });
  });

  describe('Render Job Lifecycle, Idempotency & Reconciliation', () => {
    it('atomically creates job and dispatches with worker lease fencing', async () => {
      const { job } = jobManager.createOrReuseJob('tenant-1', 'key-1', sampleRequest);
      expect(job.status).toBe('requested');

      const leasedJob = jobManager.acquireLease(job.id, 'worker-token-alpha', 30000);
      expect(leasedJob.status).toBe('running');
      expect(leasedJob.leaseToken).toBe('worker-token-alpha');

      const completedJob = await jobManager.dispatchJob(
        job.id,
        'worker-token-alpha',
        adapter,
        sampleRequest
      );
      expect(completedJob.status).toBe('succeeded');
      expect(completedJob.artifactHash).toMatch(/^sha256:[a-f0-9]{64}$/);
    });

    it('re-uses existing artifact on subsequent identical submission', async () => {
      // 1. Initial submission succeeds
      const { job } = jobManager.createOrReuseJob('tenant-1', 'key-reuse-1', sampleRequest);
      jobManager.acquireLease(job.id, 'worker-token-alpha');
      await jobManager.dispatchJob(job.id, 'worker-token-alpha', adapter, sampleRequest);

      // 2. Replay with identical key & fingerprint
      const replay = jobManager.createOrReuseJob('tenant-1', 'key-reuse-1', sampleRequest);
      expect(replay.isNew).toBe(false);
      expect(replay.isReused).toBe(true);
      expect(replay.job.artifactHash).toBe(job.artifactHash);
    });

    it('rejects fingerprint conflict when same idempotency key is submitted with different payload', () => {
      // 1. Create first job
      jobManager.createOrReuseJob('tenant-1', 'key-conflict-1', sampleRequest);

      // 2. Submit same key with modified canonicalInputHash
      const conflictingRequest: RenderRequest = {
        ...sampleRequest,
        canonicalInputHash:
          'sha256:9999999999999999999999999999999999999999999999999999999999999999',
      };

      expect(() => {
        jobManager.createOrReuseJob('tenant-1', 'key-conflict-1', conflictingRequest);
      }).toThrow(/Idempotency conflict/);
    });

    it('fences out stale worker from dispatching job', async () => {
      const { job } = jobManager.createOrReuseJob('tenant-1', 'key-fenced', sampleRequest);
      jobManager.acquireLease(job.id, 'worker-token-valid');

      await expect(
        jobManager.dispatchJob(job.id, 'worker-token-STALE', adapter, sampleRequest)
      ).rejects.toThrow(/Worker fencing violation/);
    });

    it('handles unknown outcome by entering reconciliation and transitioning to escalated if unresolved', async () => {
      // Set failure mode to reconciliation_required
      adapter.setMockFailure('key-recon-test', 'reconciliation_required');

      const reconRequest: RenderRequest = {
        ...sampleRequest,
        renderJobId: 'job-recon-1',
        idempotencyKey: 'key-recon-test',
      };

      const { job } = jobManager.createOrReuseJob('tenant-1', 'key-recon-test', reconRequest);
      jobManager.acquireLease(job.id, 'worker-token-1');

      const dispatched = await jobManager.dispatchJob(
        job.id,
        'worker-token-1',
        adapter,
        reconRequest
      );
      expect(dispatched.status).toBe('reconciling');
      expect(dispatched.errorCode).toBe('RECONCILIATION_REQUIRED');

      // Unresolved reconciliation deadline passes -> escalates
      const escalatedJob = jobManager.reconcileJob(dispatched.id);
      expect(escalatedJob.status).toBe('escalated');
      expect(escalatedJob.escalationReason).toContain('Reconciliation deadline passed');
    });

    it('successfully resolves reconciling job when verified artifact is discovered', async () => {
      adapter.setMockFailure('key-recon-success', 'reconciliation_required');

      const reconRequest: RenderRequest = {
        ...sampleRequest,
        renderJobId: 'job-recon-2',
        idempotencyKey: 'key-recon-success',
      };

      const { job } = jobManager.createOrReuseJob('tenant-1', 'key-recon-success', reconRequest);
      jobManager.acquireLease(job.id, 'worker-token-1');

      const dispatched = await jobManager.dispatchJob(
        job.id,
        'worker-token-1',
        adapter,
        reconRequest
      );
      expect(dispatched.status).toBe('reconciling');

      // Operator/reconciliation discovers artifact
      const resolvedJob = jobManager.reconcileJob(
        dispatched.id,
        'sha256:7777777777777777777777777777777777777777777777777777777777777777'
      );
      expect(resolvedJob.status).toBe('succeeded');
      expect(resolvedJob.artifactHash).toBe(
        'sha256:7777777777777777777777777777777777777777777777777777777777777777'
      );
    });
  });
});
