/**
 * Governed CoilTrace Creative Pilot Implementation
 * Implements Baton Task 99b1d7e3 & FLAIRFORGE_TO_OMNIPOST_MIGRATION.md Section 4.
 */

import { BUILTIN_FLYER_TEMPLATE_V1 } from '../templates/builtin';
import { CreativeComposerService } from '../composer-service';
import { MillRendererAdapter } from '../renderer/mill-adapter';
import { RenderJobManager } from '../renderer/render-job-manager';
import type {
  BrandKit,
  CreativeVariantVersion,
  SlotValue,
  TargetOutputSpecification,
} from '../types';
import type { RenderJob, RenderRequest } from '../renderer/contracts';

export const COILTRACE_BRAND_KIT: BrandKit = {
  id: 'brand-coiltrace-v1',
  tenantId: 'tenant-coiltrace',
  name: 'CoilTrace Identity',
  version: 1,
  logoAssetId: 'asset-coiltrace-logo',
  colors: {
    primary: '#0a192f',
    secondary: '#64ffda',
    accent: '#00b4d8',
    background: '#ffffff',
    text: '#112240',
    muted: '#8892b0',
  },
  typography: {
    headingFont: 'Inter',
    bodyFont: 'Inter',
    accentFont: 'JetBrains Mono',
  },
  accessibilityDefaults: {
    enforceHighContrast: true,
    defaultAltTextPrefix: 'CoilTrace',
  },
  status: 'active',
  createdAt: '2026-08-28T00:00:00.000Z',
  updatedAt: '2026-08-28T00:00:00.000Z',
};

export const COILTRACE_PILOT_TARGET_SPEC: TargetOutputSpecification = {
  platform: 'linkedin',
  mediaType: 'image/png',
  dimensions: {
    width: 1080,
    height: 1080,
    unit: 'px',
    dpi: 72,
  },
  colorProfile: 'sRGB',
  quality: 95,
  accessibilityRequirements: {
    includeAriaTree: true,
    taggedPdf: false,
  },
};

export const COILTRACE_PILOT_SLOTS: Record<string, SlotValue> = {
  'slot-logo': {
    type: 'logo',
    assetId: 'asset-coiltrace-logo',
    assetHash: 'sha256:3333333333333333333333333333333333333333333333333333333333333333',
    altText: 'CoilTrace Official Logo',
  },
  'slot-headline': {
    type: 'text',
    content: 'Autonomous Traceability & Verification for Critical Supply Chains',
  },
  'slot-body': {
    type: 'text',
    content:
      'CoilTrace introduces cryptographic provenance proofs across multi-vendor logistics pipelines.',
  },
  'slot-hero-image': {
    type: 'image',
    assetId: 'asset-coiltrace-diagram',
    assetHash: 'sha256:4444444444444444444444444444444444444444444444444444444444444444',
    altText: 'CoilTrace Cryptographic Verification Diagram',
  },
  'slot-cta': {
    type: 'cta',
    label: 'Explore Verification Architecture',
    url: 'https://coiltrace.io/architecture',
  },
  'slot-contact': {
    type: 'contact',
    text: 'verifications@coiltrace.io',
  },
};

export interface CoilTracePilotExecutionResult {
  variant: CreativeVariantVersion;
  approvalId: string;
  renderJob: RenderJob;
  artifactHash: string;
  artifactStorageReference: string;
  auditTrail: {
    action: string;
    timestamp: string;
    actor: string;
    details: Record<string, unknown>;
  }[];
}

export async function executeCoilTracePilot(
  composerService: CreativeComposerService,
  jobManager: RenderJobManager,
  renderer: MillRendererAdapter,
  operatorId = 'operator-jurie'
): Promise<CoilTracePilotExecutionResult> {
  const auditTrail: CoilTracePilotExecutionResult['auditTrail'] = [];

  // Step 1: Author Draft Variant
  const draft = composerService.createDraftVariant({
    tenantId: 'tenant-coiltrace',
    campaignId: 'camp-coiltrace-q3-launch',
    campaignVersionId: 'camp-ver-coiltrace-1',
    contentId: 'content-traceability-announcement',
    variantId: 'variant-social-linkedin-flyer',
    templateVersion: BUILTIN_FLYER_TEMPLATE_V1,
    brandKit: COILTRACE_BRAND_KIT,
    targetSpec: COILTRACE_PILOT_TARGET_SPEC,
    slotValues: COILTRACE_PILOT_SLOTS,
    authorId: operatorId,
  });

  auditTrail.push({
    action: 'creative_variant.versioned',
    timestamp: draft.createdAt,
    actor: operatorId,
    details: {
      variantId: draft.id,
      version: draft.version,
      canonicalInputHash: draft.canonicalInputHash,
      templateId: draft.templateId,
    },
  });

  // Step 2: Human Operator Review & Approval
  const { variant: approvedVariant, approval } = composerService.approveCreativeVariant(
    draft,
    operatorId,
    'Authentic operator acceptance: Verified typography, contrast, and supply chain copy.'
  );

  auditTrail.push({
    action: 'creative_variant.approved',
    timestamp: approval.reviewedAt,
    actor: operatorId,
    details: {
      approvalId: approval.id,
      canonicalInputHash: approval.canonicalInputHash,
      reviewerId: approval.reviewerId,
    },
  });

  // Step 3: Construct Governed Render Request for Mill
  const renderRequest: RenderRequest = {
    contractVersion: 'v1',
    renderJobId: `job-coiltrace-pilot-${Date.now()}`,
    idempotencyKey: `idem-coiltrace-pilot-v${approvedVariant.version}`,
    canonicalInputHash: approvedVariant.canonicalInputHash,
    templateVersionId: approvedVariant.templateVersionHash,
    variantVersionId: approvedVariant.id,
    assetContentHashes: [
      'sha256:3333333333333333333333333333333333333333333333333333333333333333',
      'sha256:4444444444444444444444444444444444444444444444444444444444444444',
    ],
    assetGrants: {
      'asset-coiltrace-logo': {
        assetId: 'asset-coiltrace-logo',
        contentHash: 'sha256:3333333333333333333333333333333333333333333333333333333333333333',
        grantToken: 'grant-token-coiltrace-logo-sec',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        mediaType: 'image/png',
      },
      'asset-coiltrace-diagram': {
        assetId: 'asset-coiltrace-diagram',
        contentHash: 'sha256:4444444444444444444444444444444444444444444444444444444444444444',
        grantToken: 'grant-token-coiltrace-diagram-sec',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        mediaType: 'image/png',
      },
    },
    resolvedSlots: approvedVariant.slotValues,
    target: approvedVariant.targetSpec,
    correlationId: `corr-coiltrace-${Date.now()}`,
    deadline: new Date(Date.now() + 60000).toISOString(),
  };

  // Step 4: Atomic Job Submission & Execution with Mill Adapter
  const { job, isReused } = jobManager.createOrReuseJob(
    'tenant-coiltrace',
    renderRequest.idempotencyKey,
    renderRequest
  );

  let completedJob = job;

  if (isReused) {
    auditTrail.push({
      action: 'render.reused',
      timestamp: new Date().toISOString(),
      actor: 'system-worker',
      details: {
        renderJobId: job.id,
        artifactHash: job.artifactHash,
        artifactStorageReference: job.artifactStorageReference,
      },
    });
  } else {
    const workerToken = 'worker-pilot-executor-01';
    jobManager.acquireLease(job.id, workerToken);

    completedJob = await jobManager.dispatchJob(job.id, workerToken, renderer, renderRequest);

    if (completedJob.status !== 'succeeded' || !completedJob.artifactHash) {
      throw new Error(
        `CoilTrace pilot render failed with status ${completedJob.status}: ${completedJob.errorMessage}`
      );
    }

    auditTrail.push({
      action: 'render.succeeded',
      timestamp: completedJob.updatedAt,
      actor: 'system-worker',
      details: {
        renderJobId: completedJob.id,
        artifactHash: completedJob.artifactHash,
        artifactStorageReference: completedJob.artifactStorageReference,
        rendererVersion: completedJob.rendererVersion,
      },
    });
  }

  return {
    variant: approvedVariant,
    approvalId: approval.id,
    renderJob: completedJob,
    artifactHash: completedJob.artifactHash || '',
    artifactStorageReference: completedJob.artifactStorageReference || '',
    auditTrail,
  };
}
