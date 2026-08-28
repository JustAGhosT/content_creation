/**
 * OmniPost Creative Composer Service
 * Implements the core business logic, validation, immutability, and approval bindings for creative variants.
 * Adheres to ADR 0001 & FLAIRFORGE_TO_OMNIPOST_MIGRATION.md.
 */

import {
  creativeVariantVersionSchema,
  creativeApprovalDecisionSchema,
  deriveCreativeCanonicalInputHash,
} from './schemas';
import type {
  BrandKit,
  CreativeApprovalDecision,
  CreativeTemplateVersion,
  CreativeVariantVersion,
  SlotValue,
  TargetOutputSpecification,
} from './types';

export interface CreateDraftParams {
  tenantId: string;
  campaignId: string;
  campaignVersionId: string;
  contentId: string;
  variantId: string;
  templateVersion: CreativeTemplateVersion;
  brandKit?: BrandKit;
  targetSpec: TargetOutputSpecification;
  slotValues: Record<string, SlotValue>;
  authorId: string;
}

export class CreativeComposerService {
  /**
   * Creates a new immutable draft creative variant version.
   */
  public createDraftVariant(params: CreateDraftParams): CreativeVariantVersion {
    // 1. Validate slot values against template definition
    this.validateSlotValues(params.templateVersion, params.slotValues);

    // 2. Validate tenant ownership of BrandKit if provided
    if (params.brandKit && params.brandKit.tenantId !== params.tenantId) {
      throw new Error(`Tenant ${params.tenantId} cannot access BrandKit ${params.brandKit.id}`);
    }

    // 3. Assemble accessibility metadata
    const altTexts: Record<string, string> = {};
    for (const [slotId, slotVal] of Object.entries(params.slotValues)) {
      if (slotVal.type === 'image' || slotVal.type === 'logo' || slotVal.type === 'product') {
        altTexts[slotId] = slotVal.altText;
      }
    }

    // 4. Derive canonical input hash
    const canonicalInputHash = deriveCreativeCanonicalInputHash({
      templateVersionHash: params.templateVersion.canonicalHash,
      slotValues: params.slotValues,
      targetSpec: params.targetSpec,
      accessibilityMetadata: {
        readingOrder: params.templateVersion.accessibilityRules.readingOrder,
        altTexts,
      },
    });

    const draft: CreativeVariantVersion = {
      id: `crv-${params.campaignId}-${params.variantId}-v1`,
      campaignId: params.campaignId,
      campaignVersionId: params.campaignVersionId,
      contentId: params.contentId,
      variantId: params.variantId,
      version: 1,
      templateId: params.templateVersion.templateId,
      templateVersion: params.templateVersion.version,
      templateVersionHash: params.templateVersion.canonicalHash,
      brandKitId: params.brandKit?.id,
      slotValues: params.slotValues,
      targetSpec: params.targetSpec,
      accessibilityMetadata: {
        readingOrder: params.templateVersion.accessibilityRules.readingOrder,
        altTexts,
      },
      canonicalInputHash,
      authorId: params.authorId,
      state: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return creativeVariantVersionSchema.parse(draft);
  }

  /**
   * Updates an existing creative variant by creating a new incremented version.
   * Any edit creates a new immutable version and resets approval status.
   */
  public updateVariantSlots(
    current: CreativeVariantVersion,
    templateVersion: CreativeTemplateVersion,
    newSlotValues: Record<string, SlotValue>,
    authorId: string
  ): CreativeVariantVersion {
    this.validateSlotValues(templateVersion, newSlotValues);

    const altTexts: Record<string, string> = {};
    for (const [slotId, slotVal] of Object.entries(newSlotValues)) {
      if (slotVal.type === 'image' || slotVal.type === 'logo' || slotVal.type === 'product') {
        altTexts[slotId] = slotVal.altText;
      }
    }

    const canonicalInputHash = deriveCreativeCanonicalInputHash({
      templateVersionHash: templateVersion.canonicalHash,
      slotValues: newSlotValues,
      targetSpec: current.targetSpec,
      accessibilityMetadata: {
        readingOrder: templateVersion.accessibilityRules.readingOrder,
        altTexts,
      },
    });

    const nextVersion = current.version + 1;
    const updated: CreativeVariantVersion = {
      ...current,
      id: `crv-${current.campaignId}-${current.variantId}-v${nextVersion}`,
      version: nextVersion,
      templateId: templateVersion.templateId,
      templateVersion: templateVersion.version,
      templateVersionHash: templateVersion.canonicalHash,
      slotValues: newSlotValues,
      accessibilityMetadata: {
        readingOrder: templateVersion.accessibilityRules.readingOrder,
        altTexts,
      },
      canonicalInputHash,
      authorId,
      state: 'draft', // Always resets approval state on edits
      updatedAt: new Date().toISOString(),
    };

    return creativeVariantVersionSchema.parse(updated);
  }

  /**
   * Records a server-authoritative approval decision on an exact creative variant version.
   */
  public approveCreativeVariant(
    variant: CreativeVariantVersion,
    reviewerId: string,
    notes?: string
  ): { variant: CreativeVariantVersion; approval: CreativeApprovalDecision } {
    // Extract asset hashes from media slots
    const assetHashes = Object.values(variant.slotValues)
      .filter(
        (slot): slot is Extract<SlotValue, { type: 'image' | 'logo' | 'product' }> =>
          slot.type === 'image' || slot.type === 'logo' || slot.type === 'product'
      )
      .map(slot => slot.assetHash)
      .sort();

    const approval: CreativeApprovalDecision = {
      id: `appr-crv-${variant.id}-${Date.now()}`,
      creativeVariantVersionId: variant.id,
      campaignVersionId: variant.campaignVersionId,
      contentId: variant.contentId,
      variantId: variant.variantId,
      state: 'approved',
      reviewerId,
      reviewedAt: new Date().toISOString(),
      canonicalInputHash: variant.canonicalInputHash,
      templateVersionHash: variant.templateVersionHash,
      assetHashes,
      notes,
    };

    const validatedApproval = creativeApprovalDecisionSchema.parse(approval);

    const approvedVariant: CreativeVariantVersion = {
      ...variant,
      state: 'approved',
      updatedAt: new Date().toISOString(),
    };

    return {
      variant: creativeVariantVersionSchema.parse(approvedVariant),
      approval: validatedApproval,
    };
  }

  /**
   * Rejects a creative variant version.
   */
  public rejectCreativeVariant(
    variant: CreativeVariantVersion,
    reviewerId: string,
    notes?: string
  ): { variant: CreativeVariantVersion; approval: CreativeApprovalDecision } {
    const assetHashes = Object.values(variant.slotValues)
      .filter(
        (slot): slot is Extract<SlotValue, { type: 'image' | 'logo' | 'product' }> =>
          slot.type === 'image' || slot.type === 'logo' || slot.type === 'product'
      )
      .map(slot => slot.assetHash)
      .sort();

    const approval: CreativeApprovalDecision = {
      id: `appr-crv-${variant.id}-${Date.now()}`,
      creativeVariantVersionId: variant.id,
      campaignVersionId: variant.campaignVersionId,
      contentId: variant.contentId,
      variantId: variant.variantId,
      state: 'rejected',
      reviewerId,
      reviewedAt: new Date().toISOString(),
      canonicalInputHash: variant.canonicalInputHash,
      templateVersionHash: variant.templateVersionHash,
      assetHashes,
      notes,
    };

    const rejectedVariant: CreativeVariantVersion = {
      ...variant,
      state: 'rejected',
      updatedAt: new Date().toISOString(),
    };

    return {
      variant: creativeVariantVersionSchema.parse(rejectedVariant),
      approval: creativeApprovalDecisionSchema.parse(approval),
    };
  }

  /**
   * Validates whether an approval is currently valid for a given creative variant.
   * If any slot, targetSpec, template hash, or asset changes, this returns false.
   */
  public verifyApproval(
    variant: CreativeVariantVersion,
    approval: CreativeApprovalDecision
  ): { valid: boolean; reason?: string } {
    if (approval.state !== 'approved') {
      return { valid: false, reason: 'Approval record is not in approved state' };
    }

    if (approval.creativeVariantVersionId !== variant.id) {
      return { valid: false, reason: 'Approval record targets a different variant version ID' };
    }

    if (approval.templateVersionHash !== variant.templateVersionHash) {
      return { valid: false, reason: 'Template version hash mismatch' };
    }

    if (approval.canonicalInputHash !== variant.canonicalInputHash) {
      return { valid: false, reason: 'Canonical input hash mismatch (slot or spec modified)' };
    }

    return { valid: true };
  }

  /**
   * Validates required slots and constraints against the template definition.
   */
  private validateSlotValues(
    template: CreativeTemplateVersion,
    slotValues: Record<string, SlotValue>
  ): void {
    const slotMap = new Map(template.slots.map(s => [s.id, s]));

    // Check required slots
    for (const slotDef of template.slots) {
      if (slotDef.required && !slotValues[slotDef.id]) {
        throw new Error(`Required slot "${slotDef.name}" (${slotDef.id}) is missing.`);
      }
    }

    // Check individual slot types and constraints
    for (const [slotId, slotVal] of Object.entries(slotValues)) {
      const slotDef = slotMap.get(slotId);
      if (!slotDef) {
        throw new Error(`Slot "${slotId}" is not defined in template version ${template.id}`);
      }

      if (slotDef.type === 'text' && slotVal.type !== 'text') {
        throw new Error(`Slot "${slotId}" expects text content.`);
      }

      if (
        (slotDef.type === 'image' || slotDef.type === 'logo' || slotDef.type === 'product') &&
        !(slotVal.type === 'image' || slotVal.type === 'logo' || slotVal.type === 'product')
      ) {
        throw new Error(`Slot "${slotId}" expects media content.`);
      }

      // Check alt-text rule for required alt text slots
      if (
        template.accessibilityRules.requiredAltTextSlots.includes(slotId) &&
        (slotVal.type === 'image' || slotVal.type === 'logo' || slotVal.type === 'product')
      ) {
        if (!slotVal.altText || slotVal.altText.trim().length === 0) {
          throw new Error(
            `Accessibility violation: Alt text is required for slot "${slotDef.name}" (${slotId}).`
          );
        }
      }

      // Check text length constraints
      if (slotVal.type === 'text' && slotDef.constraints?.maxLength) {
        if (slotVal.content.length > slotDef.constraints.maxLength) {
          throw new Error(
            `Slot "${slotDef.name}" exceeds maximum length of ${slotDef.constraints.maxLength} characters.`
          );
        }
      }
    }
  }
}

export const creativeComposerService = new CreativeComposerService();
