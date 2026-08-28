/**
 * OmniPost Creative Asset & Composer Types
 * Implements ADR 0001: OmniPost owns creative assets; Mill renders them.
 */

export type PlatformFormatCategory = 'social-post' | 'story' | 'banner' | 'flyer' | 'certificate';

export type SupportedPlatform =
  | 'instagram'
  | 'twitter'
  | 'linkedin'
  | 'facebook'
  | 'pinterest'
  | 'generic';

export type SlotSemanticType = 'text' | 'image' | 'logo' | 'product' | 'cta' | 'contact';

export interface CanvasDimensions {
  width: number;
  height: number;
  unit: 'px' | 'in' | 'mm';
  dpi: number;
  aspectRatio: string; // e.g. "1:1", "9:16", "16:9", "4:5"
  bleed?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
  safeArea?: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

export interface SlotBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex?: number;
}

export interface SlotConstraints {
  maxLength?: number;
  maxLines?: number;
  minFontSize?: number;
  maxFontSize?: number;
  allowMarkdown?: boolean;
  acceptedMediaTypes?: string[];
  maxByteSize?: number;
  aspectRatio?: string;
  minResolution?: { width: number; height: number };
}

export interface SlotStyleTokens {
  fontFamilyToken?: string;
  fontWeight?: string | number;
  colorToken?: string;
  backgroundColorToken?: string;
  borderRadiusToken?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  opacity?: number;
}

export interface CreativeSlotDefinition {
  id: string;
  name: string;
  type: SlotSemanticType;
  bounds: SlotBounds;
  constraints?: SlotConstraints;
  defaultValue?: string | Record<string, unknown>;
  required: boolean;
  styleTokens?: SlotStyleTokens;
  ariaLabel?: string;
}

export interface CreativeAccessibilityRules {
  readingOrder: string[]; // Ordered slot IDs
  requiredAltTextSlots: string[]; // Image/logo slot IDs that MUST have non-empty alt text
  minColorContrastRatio?: number; // e.g. 4.5
}

export interface BrandKitColors {
  primary: string;
  secondary: string;
  accent?: string;
  background: string;
  text: string;
  muted?: string;
}

export interface BrandKitTypography {
  headingFont: string;
  bodyFont: string;
  accentFont?: string;
}

export type WatermarkPosition =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | 'center-stamp';

export interface WatermarkConfig {
  enabled: boolean;
  position: WatermarkPosition;
  opacity: number; // 0.0 to 1.0
  scale: number; // 0.1 to 1.0
  badgeText?: string;
}

export interface BrandKit {
  id: string;
  tenantId: string;
  name: string;
  version: number;
  logoAssetId?: string;
  colors: BrandKitColors;
  typography: BrandKitTypography;
  watermarkConfig?: WatermarkConfig;
  accessibilityDefaults?: {
    enforceHighContrast?: boolean;
    defaultAltTextPrefix?: string;
  };
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface CreativeAsset {
  id: string;
  tenantId: string;
  mediaType: string;
  byteSize: number;
  dimensions: {
    width: number;
    height: number;
  };
  contentHash: string; // sha256:<hex>
  storageReference: string; // Opaque storage key
  provenance: 'uploaded' | 'ai-generated' | 'system-asset';
  rightsConsent: {
    confirmed: boolean;
    confirmedBy: string;
    confirmedAt: string;
  };
  accessibility: {
    altText: string;
    caption?: string;
    isDecorative?: boolean;
  };
  retentionClass: 'standard' | 'temporary' | 'archived';
  createdBy: string;
  createdAt: string;
}

export interface CreativeTemplateVersion {
  id: string;
  templateId: string;
  version: number;
  canonicalHash: string; // sha256:<hex>
  canvas: CanvasDimensions;
  slots: CreativeSlotDefinition[];
  accessibilityRules: CreativeAccessibilityRules;
  referencedAssetHashes?: string[];
  lifecycleState: 'draft' | 'published' | 'deprecated';
  createdAt: string;
  createdBy: string;
}

export interface CreativeTemplate {
  id: string;
  tenantId?: string; // undefined = system template
  brandKitId?: string;
  name: string;
  description?: string;
  category: PlatformFormatCategory;
  supportedPlatforms: SupportedPlatform[];
  currentVersion: number;
  versions: CreativeTemplateVersion[];
  createdAt: string;
  updatedAt: string;
}

export type SlotValue =
  | {
      type: 'text';
      content: string;
    }
  | {
      type: 'image' | 'logo' | 'product';
      assetId: string;
      assetHash: string; // sha256:<hex>
      altText: string;
      scale?: number;
      crop?: { x: number; y: number; width: number; height: number };
    }
  | {
      type: 'cta';
      label: string;
      url?: string;
    }
  | {
      type: 'contact';
      text: string;
      icon?: string;
    };

export interface TargetOutputSpecification {
  platform: SupportedPlatform;
  mediaType: 'image/png' | 'image/jpeg' | 'image/webp' | 'application/pdf';
  dimensions: {
    width: number;
    height: number;
    unit: 'px' | 'in' | 'mm';
    dpi: number;
  };
  colorProfile?: 'sRGB' | 'Display-P3' | 'CMYK';
  quality?: number; // 1-100
  accessibilityRequirements?: {
    includeAriaTree?: boolean;
    taggedPdf?: boolean;
  };
}

export interface CreativeVariantVersion {
  id: string;
  campaignId: string;
  campaignVersionId: string;
  contentId: string;
  variantId: string;
  version: number;
  templateId: string;
  templateVersion: number;
  templateVersionHash: string; // sha256:<hex>
  brandKitId?: string;
  slotValues: Record<string, SlotValue>;
  targetSpec: TargetOutputSpecification;
  accessibilityMetadata: {
    readingOrder: string[];
    altTexts: Record<string, string>; // slotId -> altText
  };
  canonicalInputHash: string; // sha256:<hex>
  authorId: string;
  state: 'draft' | 'pending_review' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
}

export interface CreativeApprovalDecision {
  id: string;
  creativeVariantVersionId: string;
  campaignVersionId: string;
  contentId: string;
  variantId: string;
  state: 'approved' | 'rejected';
  reviewerId: string;
  reviewedAt: string;
  canonicalInputHash: string;
  templateVersionHash: string;
  assetHashes: string[];
  notes?: string;
}

export interface RenderedAssetEntry {
  id: string;
  campaignId: string;
  variantVersionId: string;
  templateVersionHash: string;
  canonicalInputHash: string;
  artifactHash: string;
  storageReference: string;
  platform: SupportedPlatform;
  dimensions: {
    width: number;
    height: number;
    unit: string;
    dpi: number;
  };
  brandName: string;
  version: number;
  headline: string;
  createdAt: string;
  scheduledSlot?: {
    platform: SupportedPlatform;
    slotTime: string;
    targetCampaignId: string;
    scheduledAt: string;
  };
}

export interface CampaignSlotSchedule {
  id: string;
  assetId: string;
  artifactHash: string;
  targetPlatform: SupportedPlatform;
  targetCampaignId: string;
  slotTimestamp: string;
  notes?: string;
  status: 'scheduled' | 'published';
}
