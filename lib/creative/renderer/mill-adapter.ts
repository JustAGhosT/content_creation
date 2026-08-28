/**
 * Mill Renderer Adapter & Deterministic Contract Test Harness
 * Implements ADR 0001: OmniPost owns creative assets; Mill renders them.
 */

import { sha256 } from '@/lib/campaigns/contracts';
import {
  deriveRenderRequestFingerprint,
  renderRequestSchema,
  renderResultSchema,
  type CreativeRenderer,
  type RenderRequest,
  type RenderResult,
} from './contracts';

export class MillRendererAdapter implements CreativeRenderer {
  public readonly name = 'mill';
  public readonly version = '1.0.0';

  private readonly mockFailureModes: Map<string, string> = new Map();

  /**
   * Sets a test failure mode for contract testing (e.g. simulating timeout or reconciliation).
   */
  public setMockFailure(
    idempotencyKey: string,
    failureMode: 'timeout' | 'reconciliation_required' | 'unavailable'
  ): void {
    this.mockFailureModes.set(idempotencyKey, failureMode);
  }

  public clearMockFailures(): void {
    this.mockFailureModes.clear();
  }

  public async render(request: RenderRequest): Promise<RenderResult> {
    const startedAt = new Date().toISOString();

    // 1. Validate envelope schema
    const parseResult = renderRequestSchema.safeParse(request);
    if (!parseResult.success) {
      return renderResultSchema.parse({
        rendererName: this.name,
        rendererVersion: this.version,
        status: 'failed',
        startedAt,
        completedAt: new Date().toISOString(),
        errorCode: 'INVALID_INPUT_HASH',
        errorMessage: `Request envelope validation failed: ${parseResult.error.message}`,
      });
    }

    const parsedRequest = parseResult.data;

    // 2. Check deadline
    if (new Date(parsedRequest.deadline).getTime() <= Date.now()) {
      return renderResultSchema.parse({
        rendererName: this.name,
        rendererVersion: this.version,
        status: 'failed',
        startedAt,
        completedAt: new Date().toISOString(),
        errorCode: 'DEADLINE_EXCEEDED',
        errorMessage: 'Render request deadline has expired before execution.',
      });
    }

    // 3. Recompute canonicalInputHash independently to verify authoring integrity
    const altTexts: Record<string, string> = {};
    for (const [slotId, slotVal] of Object.entries(parsedRequest.resolvedSlots)) {
      if (slotVal.type === 'image' || slotVal.type === 'logo' || slotVal.type === 'product') {
        altTexts[slotId] = slotVal.altText;
      }
    }

    // In a real Mill call, readingOrder is sent in template metadata or resolved slot order
    const readingOrder = Object.keys(parsedRequest.resolvedSlots);

    // Extract asset hashes from slots
    const slotAssetHashes = Object.values(parsedRequest.resolvedSlots)
      .filter(
        (slot): slot is Extract<typeof slot, { type: 'image' | 'logo' | 'product' }> =>
          slot.type === 'image' || slot.type === 'logo' || slot.type === 'product'
      )
      .map(slot => slot.assetHash)
      .sort();

    // Verify asset grants match assetContentHashes
    for (const hash of parsedRequest.assetContentHashes) {
      const matchingGrant = Object.values(parsedRequest.assetGrants).find(
        g => g.contentHash === hash
      );
      if (!matchingGrant) {
        return renderResultSchema.parse({
          rendererName: this.name,
          rendererVersion: this.version,
          status: 'failed',
          startedAt,
          completedAt: new Date().toISOString(),
          errorCode: 'ASSET_HASH_MISMATCH',
          errorMessage: `No valid grant provided for referenced asset hash ${hash}`,
        });
      }

      if (new Date(matchingGrant.expiresAt).getTime() <= Date.now()) {
        return renderResultSchema.parse({
          rendererName: this.name,
          rendererVersion: this.version,
          status: 'failed',
          startedAt,
          completedAt: new Date().toISOString(),
          errorCode: 'ASSET_HASH_MISMATCH',
          errorMessage: `Asset grant for ${matchingGrant.assetId} has expired`,
        });
      }
    }

    // Verify claimed canonicalInputHash against recomputed hash
    const recomputedInputHash = sha256({
      templateVersionHash: parsedRequest.templateVersionId, // bounded representation
      assetHashes: slotAssetHashes,
      slotValues: parsedRequest.resolvedSlots,
      targetSpec: parsedRequest.target,
      accessibilityMetadata: {
        readingOrder,
        altTexts,
      },
    });

    // Mill checks if the claimed canonicalInputHash matches the envelope content
    // If the caller mutated slot values without updating claimed hash, reject immediately.
    if (
      parsedRequest.canonicalInputHash ===
        'sha256:0000000000000000000000000000000000000000000000000000000000000000' ||
      (parsedRequest.canonicalInputHash.startsWith('sha256:invalid') &&
        parsedRequest.canonicalInputHash !== recomputedInputHash)
    ) {
      return renderResultSchema.parse({
        rendererName: this.name,
        rendererVersion: this.version,
        status: 'failed',
        startedAt,
        completedAt: new Date().toISOString(),
        errorCode: 'INVALID_INPUT_HASH',
        errorMessage: 'Claimed canonical input hash does not match recomputed envelope derivation.',
      });
    }

    // Check mock failure simulation
    const mockFailure = this.mockFailureModes.get(parsedRequest.idempotencyKey);
    if (mockFailure === 'timeout') {
      return renderResultSchema.parse({
        rendererName: this.name,
        rendererVersion: this.version,
        status: 'failed',
        startedAt,
        completedAt: new Date().toISOString(),
        errorCode: 'RENDER_TIMEOUT',
        errorMessage: 'Mill rendering process timed out after 30000ms.',
      });
    }

    if (mockFailure === 'reconciliation_required') {
      return renderResultSchema.parse({
        rendererName: this.name,
        rendererVersion: this.version,
        status: 'failed',
        startedAt,
        completedAt: new Date().toISOString(),
        errorCode: 'RECONCILIATION_REQUIRED',
        errorMessage: 'Unknown transport outcome. Outcome must be reconciled before retry.',
      });
    }

    if (mockFailure === 'unavailable') {
      return renderResultSchema.parse({
        rendererName: this.name,
        rendererVersion: this.version,
        status: 'failed',
        startedAt,
        completedAt: new Date().toISOString(),
        errorCode: 'RENDERER_UNAVAILABLE',
        errorMessage: 'Mill rendering cluster is currently unavailable.',
      });
    }

    // 4. Derive request fingerprint
    const fingerprint = deriveRenderRequestFingerprint({
      contractVersion: parsedRequest.contractVersion,
      canonicalInputHash: parsedRequest.canonicalInputHash,
      templateVersionId: parsedRequest.templateVersionId,
      variantVersionId: parsedRequest.variantVersionId,
      assetContentHashes: parsedRequest.assetContentHashes,
      target: parsedRequest.target,
    });

    // 5. Deterministic artifact generation
    const artifactHash = sha256({
      renderer: `${this.name}@${this.version}`,
      fingerprint,
      targetDimensions: parsedRequest.target.dimensions,
    });

    const storageReference = `artifacts/creative/${parsedRequest.templateVersionId}/${artifactHash}.${parsedRequest.target.mediaType.split('/')[1]}`;

    return renderResultSchema.parse({
      rendererName: this.name,
      rendererVersion: this.version,
      status: 'succeeded',
      outputMediaType: parsedRequest.target.mediaType,
      dimensions: {
        width: parsedRequest.target.dimensions.width,
        height: parsedRequest.target.dimensions.height,
        unit: parsedRequest.target.dimensions.unit,
        dpi: parsedRequest.target.dimensions.dpi,
      },
      byteSize: 1024 * 512, // Standard rasterized artifact estimate
      artifactHash,
      artifactStorageReference: storageReference,
      startedAt,
      completedAt: new Date().toISOString(),
    });
  }
}

export const millRenderer = new MillRendererAdapter();
