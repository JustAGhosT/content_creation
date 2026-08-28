/**
 * OmniPost Creative Asset & Composer Zod Validation Schemas
 * Implements ADR 0001: OmniPost owns creative assets; Mill renders them.
 */

import { z } from 'zod';
import { sanitizeText } from '@/app/api/_utils/sanitize';
import { sha256 } from '@/lib/campaigns/contracts';
import type {
  BrandKit,
  CreativeAsset,
  CreativeTemplate,
  CreativeTemplateVersion,
  CreativeVariantVersion,
  SlotValue,
  TargetOutputSpecification,
} from './types';

const safeText = (maxLength: number) =>
  z
    .string()
    .min(1)
    .max(maxLength)
    .transform(value => sanitizeText(value));

const optionalSafeText = (maxLength: number) =>
  z
    .string()
    .max(maxLength)
    .optional()
    .transform(value => (value ? sanitizeText(value) : value));

export const hashSchema = z.string().regex(/^sha256:[a-f0-9]{64}$/);

export const platformFormatCategorySchema = z.enum([
  'social-post',
  'story',
  'banner',
  'flyer',
  'certificate',
]);

export const supportedPlatformSchema = z.enum([
  'instagram',
  'twitter',
  'linkedin',
  'facebook',
  'pinterest',
  'generic',
]);

export const slotSemanticTypeSchema = z.enum([
  'text',
  'image',
  'logo',
  'product',
  'cta',
  'contact',
]);

export const canvasDimensionsSchema = z
  .object({
    width: z.number().int().positive().max(10_000),
    height: z.number().int().positive().max(10_000),
    unit: z.enum(['px', 'in', 'mm']),
    dpi: z.number().int().min(72).max(600),
    aspectRatio: z.string().regex(/^\d+:\d+$/),
    bleed: z
      .object({
        top: z.number().nonnegative().max(500),
        bottom: z.number().nonnegative().max(500),
        left: z.number().nonnegative().max(500),
        right: z.number().nonnegative().max(500),
      })
      .strict()
      .optional(),
    safeArea: z
      .object({
        top: z.number().nonnegative().max(500),
        bottom: z.number().nonnegative().max(500),
        left: z.number().nonnegative().max(500),
        right: z.number().nonnegative().max(500),
      })
      .strict()
      .optional(),
  })
  .strict();

export const slotBoundsSchema = z
  .object({
    x: z.number().min(0).max(10_000),
    y: z.number().min(0).max(10_000),
    width: z.number().positive().max(10_000),
    height: z.number().positive().max(10_000),
    zIndex: z.number().int().min(0).max(1000).optional(),
  })
  .strict();

export const slotConstraintsSchema = z
  .object({
    maxLength: z.number().int().positive().max(50_000).optional(),
    maxLines: z.number().int().positive().max(100).optional(),
    minFontSize: z.number().positive().max(500).optional(),
    maxFontSize: z.number().positive().max(500).optional(),
    allowMarkdown: z.boolean().optional(),
    acceptedMediaTypes: z.array(z.string().max(100)).max(20).optional(),
    maxByteSize: z.number().int().positive().max(100_000_000).optional(),
    aspectRatio: z.string().max(20).optional(),
    minResolution: z
      .object({
        width: z.number().int().positive(),
        height: z.number().int().positive(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const slotStyleTokensSchema = z
  .object({
    fontFamilyToken: z.string().max(100).optional(),
    fontWeight: z.union([z.string().max(50), z.number().int().min(100).max(900)]).optional(),
    colorToken: z.string().max(100).optional(),
    backgroundColorToken: z.string().max(100).optional(),
    borderRadiusToken: z.string().max(100).optional(),
    textAlign: z.enum(['left', 'center', 'right', 'justify']).optional(),
    textTransform: z.enum(['none', 'uppercase', 'lowercase', 'capitalize']).optional(),
    opacity: z.number().min(0).max(1).optional(),
  })
  .strict();

export const creativeSlotDefinitionSchema = z
  .object({
    id: z.string().min(1).max(128),
    name: safeText(100),
    type: slotSemanticTypeSchema,
    bounds: slotBoundsSchema,
    constraints: slotConstraintsSchema.optional(),
    defaultValue: z.union([z.string().max(10_000), z.record(z.unknown())]).optional(),
    required: z.boolean(),
    styleTokens: slotStyleTokensSchema.optional(),
    ariaLabel: optionalSafeText(200),
  })
  .strict();

export const creativeAccessibilityRulesSchema = z
  .object({
    readingOrder: z.array(z.string().min(1).max(128)).max(100),
    requiredAltTextSlots: z.array(z.string().min(1).max(128)).max(100),
    minColorContrastRatio: z.number().min(1).max(21).optional(),
  })
  .strict();

export const brandKitColorsSchema = z
  .object({
    primary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    secondary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    accent: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional(),
    background: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    text: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    muted: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional(),
  })
  .strict();

export const brandKitTypographySchema = z
  .object({
    headingFont: safeText(100),
    bodyFont: safeText(100),
    accentFont: optionalSafeText(100),
  })
  .strict();

export const brandKitSchema: z.ZodType<BrandKit> = z
  .object({
    id: z.string().min(1).max(128),
    tenantId: z.string().min(1).max(128),
    name: safeText(200),
    version: z.number().int().positive(),
    logoAssetId: z.string().max(128).optional(),
    colors: brandKitColorsSchema,
    typography: brandKitTypographySchema,
    accessibilityDefaults: z
      .object({
        enforceHighContrast: z.boolean().optional(),
        defaultAltTextPrefix: optionalSafeText(100),
      })
      .strict()
      .optional(),
    status: z.enum(['active', 'archived']),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export const creativeAssetSchema: z.ZodType<CreativeAsset> = z
  .object({
    id: z.string().min(1).max(128),
    tenantId: z.string().min(1).max(128),
    mediaType: z.string().max(100),
    byteSize: z.number().int().positive().max(100_000_000),
    dimensions: z
      .object({
        width: z.number().int().positive().max(10_000),
        height: z.number().int().positive().max(10_000),
      })
      .strict(),
    contentHash: hashSchema,
    storageReference: z.string().min(1).max(500),
    provenance: z.enum(['uploaded', 'ai-generated', 'system-asset']),
    rightsConsent: z
      .object({
        confirmed: z.boolean(),
        confirmedBy: safeText(100),
        confirmedAt: z.string().datetime(),
      })
      .strict(),
    accessibility: z
      .object({
        altText: safeText(1000),
        caption: optionalSafeText(1000),
        isDecorative: z.boolean().optional(),
      })
      .strict(),
    retentionClass: z.enum(['standard', 'temporary', 'archived']),
    createdBy: safeText(100),
    createdAt: z.string().datetime(),
  })
  .strict();

export const creativeTemplateVersionSchema: z.ZodType<CreativeTemplateVersion> = z
  .object({
    id: z.string().min(1).max(128),
    templateId: z.string().min(1).max(128),
    version: z.number().int().positive(),
    canonicalHash: hashSchema,
    canvas: canvasDimensionsSchema,
    slots: z.array(creativeSlotDefinitionSchema).max(50),
    accessibilityRules: creativeAccessibilityRulesSchema,
    referencedAssetHashes: z.array(hashSchema).max(50).optional(),
    lifecycleState: z.enum(['draft', 'published', 'deprecated']),
    createdAt: z.string().datetime(),
    createdBy: safeText(100),
  })
  .strict();

export const creativeTemplateSchema: z.ZodType<CreativeTemplate> = z
  .object({
    id: z.string().min(1).max(128),
    tenantId: z.string().max(128).optional(),
    brandKitId: z.string().max(128).optional(),
    name: safeText(200),
    description: optionalSafeText(2000),
    category: platformFormatCategorySchema,
    supportedPlatforms: z.array(supportedPlatformSchema).min(1).max(10),
    currentVersion: z.number().int().positive(),
    versions: z.array(creativeTemplateVersionSchema).max(100),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

const mediaSlotSchema = (literalType: 'image' | 'logo' | 'product') =>
  z
    .object({
      type: z.literal(literalType),
      assetId: z.string().min(1).max(128),
      assetHash: hashSchema,
      altText: safeText(1000),
      scale: z.number().positive().max(10).optional(),
      crop: z
        .object({
          x: z.number().min(0),
          y: z.number().min(0),
          width: z.number().positive(),
          height: z.number().positive(),
        })
        .strict()
        .optional(),
    })
    .strict();

export const slotValueSchema: z.ZodType<SlotValue> = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('text'),
      content: safeText(10_000),
    })
    .strict(),
  mediaSlotSchema('image'),
  mediaSlotSchema('logo'),
  mediaSlotSchema('product'),
  z
    .object({
      type: z.literal('cta'),
      label: safeText(200),
      url: z.string().url().max(2000).optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal('contact'),
      text: safeText(500),
      icon: optionalSafeText(50),
    })
    .strict(),
]);

export const targetOutputSpecificationSchema: z.ZodType<TargetOutputSpecification> = z
  .object({
    platform: supportedPlatformSchema,
    mediaType: z.enum(['image/png', 'image/jpeg', 'image/webp', 'application/pdf']),
    dimensions: z
      .object({
        width: z.number().int().positive().max(10_000),
        height: z.number().int().positive().max(10_000),
        unit: z.enum(['px', 'in', 'mm']),
        dpi: z.number().int().min(72).max(600),
      })
      .strict(),
    colorProfile: z.enum(['sRGB', 'Display-P3', 'CMYK']).optional(),
    quality: z.number().int().min(1).max(100).optional(),
    accessibilityRequirements: z
      .object({
        includeAriaTree: z.boolean().optional(),
        taggedPdf: z.boolean().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const creativeVariantVersionSchema: z.ZodType<CreativeVariantVersion> = z
  .object({
    id: z.string().min(1).max(128),
    campaignId: z.string().min(1).max(128),
    campaignVersionId: z.string().min(1).max(128),
    contentId: z.string().min(1).max(128),
    variantId: z.string().min(1).max(128),
    version: z.number().int().positive(),
    templateId: z.string().min(1).max(128),
    templateVersion: z.number().int().positive(),
    templateVersionHash: hashSchema,
    brandKitId: z.string().max(128).optional(),
    slotValues: z.record(slotValueSchema),
    targetSpec: targetOutputSpecificationSchema,
    accessibilityMetadata: z
      .object({
        readingOrder: z.array(z.string().min(1).max(128)).max(100),
        altTexts: z.record(safeText(1000)),
      })
      .strict(),
    canonicalInputHash: hashSchema,
    authorId: safeText(100),
    state: z.enum(['draft', 'pending_review', 'approved', 'rejected']),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

export const creativeApprovalDecisionSchema = z
  .object({
    id: z.string().min(1).max(128),
    creativeVariantVersionId: z.string().min(1).max(128),
    campaignVersionId: z.string().min(1).max(128),
    contentId: z.string().min(1).max(128),
    variantId: z.string().min(1).max(128),
    state: z.enum(['approved', 'rejected']),
    reviewerId: safeText(100),
    reviewedAt: z.string().datetime(),
    canonicalInputHash: hashSchema,
    templateVersionHash: hashSchema,
    assetHashes: z.array(hashSchema).max(50),
    notes: optionalSafeText(1000),
  })
  .strict();

/**
 * Derives the canonical input hash for an exact creative variant setup.
 * Conforms strictly to ADR 0001:
 * - Immutable templateVersionHash
 * - Slot values mapped with stable ordering
 * - Target output specification
 * - Accessibility metadata
 */
export function deriveCreativeCanonicalInputHash(input: {
  templateVersionHash: string;
  slotValues: Record<string, SlotValue>;
  targetSpec: TargetOutputSpecification;
  accessibilityMetadata: {
    readingOrder: string[];
    altTexts: Record<string, string>;
  };
}): string {
  // Extract ordered asset hashes from media slots
  const assetHashes = Object.values(input.slotValues)
    .filter(
      (slot): slot is Extract<SlotValue, { type: 'image' | 'logo' | 'product' }> =>
        slot.type === 'image' || slot.type === 'logo' || slot.type === 'product'
    )
    .map(slot => slot.assetHash)
    .sort();

  return sha256({
    templateVersionHash: input.templateVersionHash,
    assetHashes,
    slotValues: input.slotValues,
    targetSpec: input.targetSpec,
    accessibilityMetadata: input.accessibilityMetadata,
  });
}
