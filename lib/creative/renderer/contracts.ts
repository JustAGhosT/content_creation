/**
 * Creative Renderer Port & Mill Envelope Contracts
 * Implements ADR 0001: OmniPost owns creative assets; Mill renders them.
 */

import { z } from 'zod';
import { sha256 } from '@/lib/campaigns/contracts';
import { hashSchema, slotValueSchema, targetOutputSpecificationSchema } from '../schemas';
import type { SlotValue, TargetOutputSpecification } from '../types';

export const renderContractVersionSchema = z.literal('v1');

export const assetGrantSchema = z
  .object({
    assetId: z.string().min(1).max(128),
    contentHash: hashSchema,
    grantToken: z.string().min(1).max(500),
    expiresAt: z.string().datetime(),
    mediaType: z.string().max(100),
  })
  .strict();

export interface AssetGrant {
  assetId: string;
  contentHash: string;
  grantToken: string;
  expiresAt: string;
  mediaType: string;
}

export interface RenderRequest {
  contractVersion: 'v1';
  renderJobId: string;
  idempotencyKey: string;
  canonicalInputHash: string;
  templateVersionId: string;
  variantVersionId: string;
  assetContentHashes: string[];
  assetGrants: Record<string, AssetGrant>;
  resolvedSlots: Record<string, SlotValue>;
  target: TargetOutputSpecification;
  correlationId: string;
  deadline: string;
}

export const renderRequestSchema: z.ZodType<RenderRequest> = z
  .object({
    contractVersion: renderContractVersionSchema,
    renderJobId: z.string().min(1).max(128),
    idempotencyKey: z.string().min(1).max(128),
    canonicalInputHash: hashSchema,
    templateVersionId: z.string().min(1).max(128),
    variantVersionId: z.string().min(1).max(128),
    assetContentHashes: z.array(hashSchema),
    assetGrants: z.record(assetGrantSchema),
    resolvedSlots: z.record(slotValueSchema),
    target: targetOutputSpecificationSchema,
    correlationId: z.string().min(1).max(128),
    deadline: z.string().datetime(),
  })
  .strict();

export interface RenderFingerprintInput {
  contractVersion: 'v1';
  canonicalInputHash: string;
  templateVersionId: string;
  variantVersionId: string;
  assetContentHashes: string[];
  target: {
    platform: string;
    mediaType: string;
    dimensions: {
      width: number;
      height: number;
      unit: string;
      dpi: number;
    };
    colorProfile?: string;
    qualityConstraints?: number;
    accessibilityOutputRequirements?: {
      includeAriaTree?: boolean;
      taggedPdf?: boolean;
    };
  };
}

export const renderErrorCodeSchema = z.enum([
  'INVALID_INPUT_HASH',
  'FINGERPRINT_CONFLICT',
  'ASSET_HASH_MISMATCH',
  'DEADLINE_EXCEEDED',
  'UNSUPPORTED_FORMAT',
  'RECONCILIATION_REQUIRED',
  'RENDER_TIMEOUT',
  'RENDERER_UNAVAILABLE',
]);

export type RenderErrorCode = z.infer<typeof renderErrorCodeSchema>;

export interface RenderResult {
  rendererName: string;
  rendererVersion: string;
  status: 'succeeded' | 'failed';
  outputMediaType?: string;
  dimensions?: {
    width: number;
    height: number;
    unit: string;
    dpi: number;
  };
  byteSize?: number;
  artifactHash?: string;
  artifactStorageReference?: string;
  startedAt: string;
  completedAt: string;
  warnings?: string[];
  errorCode?: RenderErrorCode;
  errorMessage?: string;
}

export const renderResultSchema: z.ZodType<RenderResult> = z
  .object({
    rendererName: z.string().min(1).max(100),
    rendererVersion: z.string().min(1).max(50),
    status: z.enum(['succeeded', 'failed']),
    outputMediaType: z.string().max(100).optional(),
    dimensions: z
      .object({
        width: z.number().positive(),
        height: z.number().positive(),
        unit: z.string().max(10),
        dpi: z.number().positive(),
      })
      .strict()
      .optional(),
    byteSize: z.number().int().positive().optional(),
    artifactHash: hashSchema.optional(),
    artifactStorageReference: z.string().max(500).optional(),
    startedAt: z.string().datetime(),
    completedAt: z.string().datetime(),
    warnings: z.array(z.string().max(500)).optional(),
    errorCode: renderErrorCodeSchema.optional(),
    errorMessage: z.string().max(1000).optional(),
  })
  .strict();

export type RenderJobStatus =
  | 'requested'
  | 'running'
  | 'reconciling'
  | 'escalated'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'expired';

export interface RenderJob {
  id: string;
  tenantId: string;
  idempotencyKey: string;
  requestFingerprint: string;
  status: RenderJobStatus;
  attemptCount: number;
  maxAttempts: number;
  leaseToken?: string;
  leaseExpiresAt?: string;
  lastHeartbeatAt?: string;
  millAttemptReference?: string;
  rendererVersion?: string;
  artifactHash?: string;
  artifactStorageReference?: string;
  errorCode?: RenderErrorCode;
  errorMessage?: string;
  escalatedAt?: string;
  escalationReason?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Derives the request fingerprint according to ADR 0001:
 * Fingerprint = sha256(canonical-json-v1(fingerprintInput))
 * Excludes operational/transport fields (renderJobId, idempotencyKey, assetGrants, correlationId, deadline).
 */
export function deriveRenderRequestFingerprint(request: {
  contractVersion: 'v1';
  canonicalInputHash: string;
  templateVersionId: string;
  variantVersionId: string;
  assetContentHashes: string[];
  target: TargetOutputSpecification;
}): string {
  const sortedAssetHashes = [...request.assetContentHashes].sort();

  const fingerprintInput: RenderFingerprintInput = {
    contractVersion: request.contractVersion,
    canonicalInputHash: request.canonicalInputHash,
    templateVersionId: request.templateVersionId,
    variantVersionId: request.variantVersionId,
    assetContentHashes: sortedAssetHashes,
    target: {
      platform: request.target.platform,
      mediaType: request.target.mediaType,
      dimensions: {
        width: request.target.dimensions.width,
        height: request.target.dimensions.height,
        unit: request.target.dimensions.unit,
        dpi: request.target.dimensions.dpi,
      },
      colorProfile: request.target.colorProfile,
      qualityConstraints: request.target.quality,
      accessibilityOutputRequirements: request.target.accessibilityRequirements,
    },
  };

  return sha256(fingerprintInput);
}

/**
 * Provider-neutral CreativeRenderer interface.
 * Implemented by Mill adapter or deterministic test harnesses.
 */
export interface CreativeRenderer {
  name: string;
  version: string;
  render(request: RenderRequest): Promise<RenderResult>;
}
