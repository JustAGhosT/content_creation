/**
 * Contract Tests for OmniPost Creative Assets and Composer
 * Implements verification requirements from ADR 0001 and FLAIRFORGE_TO_OMNIPOST_MIGRATION.md.
 */

import {
  deriveCreativeCanonicalInputHash,
  creativeVariantVersionSchema,
  creativeTemplateVersionSchema,
} from '@/lib/creative/schemas';
import { BUILTIN_FLYER_TEMPLATE_V1 } from '@/lib/creative/templates/builtin';
import { CreativeComposerService } from '@/lib/creative/composer-service';
import type {
  BrandKit,
  CreativeVariantVersion,
  SlotValue,
  TargetOutputSpecification,
} from '@/lib/creative/types';

describe('Creative Asset and Composer Contracts', () => {
  const service = new CreativeComposerService();

  const mockBrandKitTenantA: BrandKit = {
    id: 'brand-tenant-a',
    tenantId: 'tenant-123',
    name: 'Tenant A Brand',
    version: 1,
    colors: {
      primary: '#0055ff',
      secondary: '#ff5500',
      background: '#ffffff',
      text: '#111111',
    },
    typography: {
      headingFont: 'Inter',
      bodyFont: 'Roboto',
    },
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const validTargetSpec: TargetOutputSpecification = {
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

  const validSlotValues: Record<string, SlotValue> = {
    'slot-logo': {
      type: 'logo',
      assetId: 'asset-logo-1',
      assetHash: 'sha256:1111111111111111111111111111111111111111111111111111111111111111',
      altText: 'Company Logo',
    },
    'slot-headline': {
      type: 'text',
      content: 'Major Product Launch 2026',
    },
    'slot-body': {
      type: 'text',
      content: 'Experience next generation autonomous publishing.',
    },
    'slot-hero-image': {
      type: 'image',
      assetId: 'asset-hero-1',
      assetHash: 'sha256:2222222222222222222222222222222222222222222222222222222222222222',
      altText: 'Product Hero Graphic',
    },
    'slot-cta': {
      type: 'cta',
      label: 'Get Started Today',
      url: 'https://omnipost.app/launch',
    },
    'slot-contact': {
      type: 'contact',
      text: 'contact@omnipost.app',
    },
  };

  describe('Builtin Template Conformance', () => {
    it('validates builtin flyer template version schema and hash format', () => {
      const parsed = creativeTemplateVersionSchema.parse(BUILTIN_FLYER_TEMPLATE_V1);
      expect(parsed.canonicalHash).toMatch(/^sha256:[a-f0-9]{64}$/);
      expect(parsed.canvas.width).toBe(1080);
      expect(parsed.slots.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Canonical Input Hash Stability & Independent Invalidation', () => {
    it('generates deterministic canonical hash for identical inputs', () => {
      const hash1 = deriveCreativeCanonicalInputHash({
        templateVersionHash: BUILTIN_FLYER_TEMPLATE_V1.canonicalHash,
        slotValues: validSlotValues,
        targetSpec: validTargetSpec,
        accessibilityMetadata: {
          readingOrder: BUILTIN_FLYER_TEMPLATE_V1.accessibilityRules.readingOrder,
          altTexts: {
            'slot-logo': 'Company Logo',
            'slot-hero-image': 'Product Hero Graphic',
          },
        },
      });

      const hash2 = deriveCreativeCanonicalInputHash({
        templateVersionHash: BUILTIN_FLYER_TEMPLATE_V1.canonicalHash,
        slotValues: validSlotValues,
        targetSpec: validTargetSpec,
        accessibilityMetadata: {
          readingOrder: BUILTIN_FLYER_TEMPLATE_V1.accessibilityRules.readingOrder,
          altTexts: {
            'slot-logo': 'Company Logo',
            'slot-hero-image': 'Product Hero Graphic',
          },
        },
      });

      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^sha256:[a-f0-9]{64}$/);
    });

    it('invalidates canonical input hash when text slot content changes', () => {
      const baseHash = deriveCreativeCanonicalInputHash({
        templateVersionHash: BUILTIN_FLYER_TEMPLATE_V1.canonicalHash,
        slotValues: validSlotValues,
        targetSpec: validTargetSpec,
        accessibilityMetadata: {
          readingOrder: BUILTIN_FLYER_TEMPLATE_V1.accessibilityRules.readingOrder,
          altTexts: { 'slot-logo': 'Company Logo' },
        },
      });

      const modifiedSlots = {
        ...validSlotValues,
        'slot-headline': {
          type: 'text' as const,
          content: 'Different Headline Text',
        },
      };

      const modifiedHash = deriveCreativeCanonicalInputHash({
        templateVersionHash: BUILTIN_FLYER_TEMPLATE_V1.canonicalHash,
        slotValues: modifiedSlots,
        targetSpec: validTargetSpec,
        accessibilityMetadata: {
          readingOrder: BUILTIN_FLYER_TEMPLATE_V1.accessibilityRules.readingOrder,
          altTexts: { 'slot-logo': 'Company Logo' },
        },
      });

      expect(modifiedHash).not.toBe(baseHash);
    });

    it('invalidates canonical input hash when media asset hash changes', () => {
      const baseHash = deriveCreativeCanonicalInputHash({
        templateVersionHash: BUILTIN_FLYER_TEMPLATE_V1.canonicalHash,
        slotValues: validSlotValues,
        targetSpec: validTargetSpec,
        accessibilityMetadata: {
          readingOrder: BUILTIN_FLYER_TEMPLATE_V1.accessibilityRules.readingOrder,
          altTexts: { 'slot-logo': 'Company Logo' },
        },
      });

      const modifiedSlots = {
        ...validSlotValues,
        'slot-logo': {
          type: 'logo' as const,
          assetId: 'asset-logo-1',
          assetHash: 'sha256:9999999999999999999999999999999999999999999999999999999999999999',
          altText: 'Company Logo',
        },
      };

      const modifiedHash = deriveCreativeCanonicalInputHash({
        templateVersionHash: BUILTIN_FLYER_TEMPLATE_V1.canonicalHash,
        slotValues: modifiedSlots,
        targetSpec: validTargetSpec,
        accessibilityMetadata: {
          readingOrder: BUILTIN_FLYER_TEMPLATE_V1.accessibilityRules.readingOrder,
          altTexts: { 'slot-logo': 'Company Logo' },
        },
      });

      expect(modifiedHash).not.toBe(baseHash);
    });

    it('invalidates canonical input hash when target dimensions or DPI change', () => {
      const baseHash = deriveCreativeCanonicalInputHash({
        templateVersionHash: BUILTIN_FLYER_TEMPLATE_V1.canonicalHash,
        slotValues: validSlotValues,
        targetSpec: validTargetSpec,
        accessibilityMetadata: {
          readingOrder: BUILTIN_FLYER_TEMPLATE_V1.accessibilityRules.readingOrder,
          altTexts: { 'slot-logo': 'Company Logo' },
        },
      });

      const modifiedSpec: TargetOutputSpecification = {
        ...validTargetSpec,
        dimensions: {
          ...validTargetSpec.dimensions,
          dpi: 300, // Print DPI change
        },
      };

      const modifiedHash = deriveCreativeCanonicalInputHash({
        templateVersionHash: BUILTIN_FLYER_TEMPLATE_V1.canonicalHash,
        slotValues: validSlotValues,
        targetSpec: modifiedSpec,
        accessibilityMetadata: {
          readingOrder: BUILTIN_FLYER_TEMPLATE_V1.accessibilityRules.readingOrder,
          altTexts: { 'slot-logo': 'Company Logo' },
        },
      });

      expect(modifiedHash).not.toBe(baseHash);
    });
  });

  describe('Composer Lifecycle, Versioning & Server-Side Approval', () => {
    it('creates a schema-valid draft variant with version 1', () => {
      const draft = service.createDraftVariant({
        tenantId: 'tenant-123',
        campaignId: 'camp-1',
        campaignVersionId: 'camp-ver-1',
        contentId: 'cont-1',
        variantId: 'var-1',
        templateVersion: BUILTIN_FLYER_TEMPLATE_V1,
        brandKit: mockBrandKitTenantA,
        targetSpec: validTargetSpec,
        slotValues: validSlotValues,
        authorId: 'user-jurie',
      });

      expect(draft.version).toBe(1);
      expect(draft.state).toBe('draft');
      expect(creativeVariantVersionSchema.parse(draft)).toBeDefined();
    });

    it('enforces tenant isolation and rejects cross-tenant BrandKit usage', () => {
      expect(() => {
        service.createDraftVariant({
          tenantId: 'tenant-intruder-456',
          campaignId: 'camp-1',
          campaignVersionId: 'camp-ver-1',
          contentId: 'cont-1',
          variantId: 'var-1',
          templateVersion: BUILTIN_FLYER_TEMPLATE_V1,
          brandKit: mockBrandKitTenantA, // Belongs to tenant-123
          targetSpec: validTargetSpec,
          slotValues: validSlotValues,
          authorId: 'user-intruder',
        });
      }).toThrow(/Tenant tenant-intruder-456 cannot access BrandKit/);
    });

    it('enforces accessibility alt text requirement on required media slots', () => {
      const invalidSlots = {
        ...validSlotValues,
        'slot-logo': {
          type: 'logo' as const,
          assetId: 'asset-logo-1',
          assetHash: 'sha256:1111111111111111111111111111111111111111111111111111111111111111',
          altText: '   ', // Empty/whitespace alt text
        },
      };

      expect(() => {
        service.createDraftVariant({
          tenantId: 'tenant-123',
          campaignId: 'camp-1',
          campaignVersionId: 'camp-ver-1',
          contentId: 'cont-1',
          variantId: 'var-1',
          templateVersion: BUILTIN_FLYER_TEMPLATE_V1,
          targetSpec: validTargetSpec,
          slotValues: invalidSlots,
          authorId: 'user-jurie',
        });
      }).toThrow(/Accessibility violation: Alt text is required/);
    });

    it('approves a creative variant and binds immutable hashes', () => {
      const draft = service.createDraftVariant({
        tenantId: 'tenant-123',
        campaignId: 'camp-1',
        campaignVersionId: 'camp-ver-1',
        contentId: 'cont-1',
        variantId: 'var-1',
        templateVersion: BUILTIN_FLYER_TEMPLATE_V1,
        targetSpec: validTargetSpec,
        slotValues: validSlotValues,
        authorId: 'user-jurie',
      });

      const { variant: approvedVariant, approval } = service.approveCreativeVariant(
        draft,
        'reviewer-smit',
        'Verified branding and copy.'
      );

      expect(approvedVariant.state).toBe('approved');
      expect(approval.state).toBe('approved');
      expect(approval.canonicalInputHash).toBe(draft.canonicalInputHash);
      expect(approval.templateVersionHash).toBe(draft.templateVersionHash);

      const verification = service.verifyApproval(approvedVariant, approval);
      expect(verification.valid).toBe(true);
    });

    it('invalidates approval when variant is modified to create a new version', () => {
      const draft = service.createDraftVariant({
        tenantId: 'tenant-123',
        campaignId: 'camp-1',
        campaignVersionId: 'camp-ver-1',
        contentId: 'cont-1',
        variantId: 'var-1',
        templateVersion: BUILTIN_FLYER_TEMPLATE_V1,
        targetSpec: validTargetSpec,
        slotValues: validSlotValues,
        authorId: 'user-jurie',
      });

      const { variant: approvedV1, approval: approvalV1 } = service.approveCreativeVariant(
        draft,
        'reviewer-smit'
      );

      // User edits the headline
      const editedSlots = {
        ...validSlotValues,
        'slot-headline': {
          type: 'text' as const,
          content: 'Updated Post-Approval Headline',
        },
      };

      const updatedV2 = service.updateVariantSlots(
        approvedV1,
        BUILTIN_FLYER_TEMPLATE_V1,
        editedSlots,
        'user-jurie'
      );

      expect(updatedV2.version).toBe(2);
      expect(updatedV2.state).toBe('draft'); // Reset to draft

      // Old approval fails verification against v2 due to variant version ID
      const verificationV2 = service.verifyApproval(updatedV2, approvalV1);
      expect(verificationV2.valid).toBe(false);
      expect(verificationV2.reason).toContain('targets a different variant version ID');

      // If someone attempted to forge v1 with modified slots, it fails on canonical hash mismatch
      const forgedV1: CreativeVariantVersion = {
        ...approvedV1,
        slotValues: editedSlots,
        canonicalInputHash:
          'sha256:0000000000000000000000000000000000000000000000000000000000000000',
      };
      const forgedVerification = service.verifyApproval(forgedV1, approvalV1);
      expect(forgedVerification.valid).toBe(false);
      expect(forgedVerification.reason).toMatch(/mismatch/);
    });
  });
});
