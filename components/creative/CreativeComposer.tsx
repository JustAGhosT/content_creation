'use client';

import React, { useState, useMemo, useRef } from 'react';
import styles from '@/styles/CreativeComposer.module.css';
import { sha256 } from '@/lib/campaigns/contracts';
import { BUILTIN_FLYER_TEMPLATE_V1 } from '@/lib/creative/templates/builtin';
import {
  ALL_BRAND_KIT_PRESETS,
  AVAILABLE_FONTS,
  COILTRACE_BRAND_KIT,
} from '@/lib/creative/presets';
import {
  extractPaletteFromSeed,
  getContrastRatio,
  getRelativeLuminance,
  evaluateWcagCompliance,
} from '@/lib/creative/palette';
import { executeStreamingRender, RenderStreamEvent } from '@/lib/creative/renderer/stream';
import type { RenderRequest } from '@/lib/creative/renderer/contracts';
import type {
  BrandKit,
  RenderedAssetEntry,
  SupportedPlatform,
  WatermarkConfig,
  WatermarkPosition,
} from '@/lib/creative/types';
import { useToast } from '@/components/ui';

type PlatformPreset = 'instagram' | 'linkedin' | 'story';
type ViewMode = 'single' | 'matrix' | 'gallery';

interface CreativeComposerProps {
  campaignId?: string;
  onApprovalComplete?: (result: {
    artifactHash: string;
    canonicalInputHash: string;
    approvalId: string;
  }) => void;
}

export const CreativeComposer: React.FC<CreativeComposerProps> = ({
  campaignId = 'camp-coiltrace-q3',
  onApprovalComplete,
}) => {
  const toast = useToast();

  // State for view & brand
  const [platform, setPlatform] = useState<PlatformPreset>('linkedin');
  const [viewMode, setViewMode] = useState<ViewMode>('single');
  const [selectedBrand, setSelectedBrand] = useState<BrandKit>(COILTRACE_BRAND_KIT);
  const [focusedSlot, setFocusedSlot] = useState<string | null>(null);

  // Custom Typography & Watermark State
  const [customHeadingFont, setCustomHeadingFont] = useState(selectedBrand.typography.headingFont);
  const [customBodyFont, setCustomBodyFont] = useState(selectedBrand.typography.bodyFont);
  const [customAccentFont, setCustomAccentFont] = useState(
    selectedBrand.typography.accentFont || 'JetBrains Mono'
  );
  const [watermark, setWatermark] = useState<WatermarkConfig>(
    selectedBrand.watermarkConfig || {
      enabled: true,
      position: 'bottom-right',
      opacity: 0.75,
      scale: 0.6,
      badgeText: `Verified by ${selectedBrand.name}`,
    }
  );

  // Editable slots state
  const [headline, setHeadline] = useState('Autonomous Traceability & Verification');
  const [bodyText, setBodyText] = useState(
    'CoilTrace introduces cryptographic provenance proofs across multi-vendor logistics pipelines.'
  );
  const [logoAlt, setLogoAlt] = useState('CoilTrace Official Logo');
  const [heroAlt, setHeroAlt] = useState('Verification Flow Diagram');
  const [ctaLabel, setCtaLabel] = useState('Explore Architecture');
  const [ctaUrl, setCtaUrl] = useState('https://coiltrace.io/architecture');
  const [contactInfo, setContactInfo] = useState('verifications@coiltrace.io');

  // Input refs for direct focus from canvas clicks
  const headlineInputRef = useRef<HTMLInputElement>(null);
  const bodyInputRef = useRef<HTMLTextAreaElement>(null);
  const logoAltInputRef = useRef<HTMLInputElement>(null);
  const heroAltInputRef = useRef<HTMLInputElement>(null);
  const ctaLabelInputRef = useRef<HTMLInputElement>(null);
  const contactInputRef = useRef<HTMLInputElement>(null);

  // Lifecycle & SSE Streaming states
  const [version, setVersion] = useState(1);
  const [isApproved, setIsApproved] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [streamProgress, setStreamProgress] = useState(0);
  const [streamStage, setStreamStage] = useState<string>('idle');
  const [streamMessage, setStreamMessage] = useState<string>('');
  const [artifactHash, setArtifactHash] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  // Asset Library / Media Grid state
  const [renderedAssets, setRenderedAssets] = useState<RenderedAssetEntry[]>([
    {
      id: 'asset-rendered-init-1',
      campaignId,
      variantVersionId: 'crv-variant-1',
      templateVersionHash: BUILTIN_FLYER_TEMPLATE_V1.canonicalHash,
      canonicalInputHash: 'sha256:4f89d3c52a36b12a5e8f4c9a2d3b5c7e1f4a8b9c2d3e4f5a6b7c8d9e0f1a2b3c',
      artifactHash: 'sha256:7b21e85f692018274a8d4621c3859701a2f64839201847582910394857201948',
      storageReference: 'artifacts/creative/builtin-flyer/linkedin-coiltrace.png',
      platform: 'linkedin',
      dimensions: { width: 1200, height: 627, unit: 'px', dpi: 72 },
      brandName: 'CoilTrace Identity',
      version: 1,
      headline: 'Autonomous Traceability & Verification',
      createdAt: '2026-08-28T08:00:00.000Z',
      scheduledSlot: {
        platform: 'linkedin',
        slotTime: '2026-09-01T09:00:00.000Z',
        targetCampaignId: campaignId,
        scheduledAt: '2026-08-28T08:15:00.000Z',
      },
    },
  ]);

  // Dynamic Contrast Evaluation
  const contrastRatio = useMemo(() => {
    return getContrastRatio(selectedBrand.colors.text, selectedBrand.colors.background);
  }, [selectedBrand.colors.text, selectedBrand.colors.background]);

  const wcagScore = useMemo(() => {
    return evaluateWcagCompliance(contrastRatio);
  }, [contrastRatio]);

  // Copy helper
  const copyToClipboard = (text: string, label: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
    toast.success(`Copied ${label} to clipboard!`, 3000);
  };

  // Compute live Canonical Input Hash
  const canonicalInputHash = useMemo(() => {
    return sha256({
      templateVersionHash: BUILTIN_FLYER_TEMPLATE_V1.canonicalHash,
      assetHashes: [
        'sha256:3333333333333333333333333333333333333333333333333333333333333333',
        'sha256:4444444444444444444444444444444444444444444444444444444444444444',
      ],
      slotValues: {
        'slot-headline': { type: 'text', content: headline },
        'slot-body': { type: 'text', content: bodyText },
        'slot-logo': {
          type: 'logo',
          assetId: selectedBrand.logoAssetId,
          assetHash: 'sha256:3333333333333333333333333333333333333333333333333333333333333333',
          altText: logoAlt,
        },
        'slot-hero-image': {
          type: 'image',
          assetId: 'asset-diagram',
          assetHash: 'sha256:4444444444444444444444444444444444444444444444444444444444444444',
          altText: heroAlt,
        },
        'slot-cta': { type: 'cta', label: ctaLabel, url: ctaUrl },
        'slot-contact': { type: 'contact', text: contactInfo },
      },
      targetSpec: {
        platform,
        dimensions:
          platform === 'linkedin'
            ? { width: 1200, height: 627, unit: 'px', dpi: 72 }
            : platform === 'story'
              ? { width: 1080, height: 1920, unit: 'px', dpi: 72 }
              : { width: 1080, height: 1080, unit: 'px', dpi: 72 },
      },
      watermarkConfig: watermark,
      customTypography: {
        headingFont: customHeadingFont,
        bodyFont: customBodyFont,
        accentFont: customAccentFont,
      },
    });
  }, [
    headline,
    bodyText,
    logoAlt,
    heroAlt,
    ctaLabel,
    ctaUrl,
    contactInfo,
    platform,
    selectedBrand,
    watermark,
    customHeadingFont,
    customBodyFont,
    customAccentFont,
  ]);

  // Request Fingerprint
  const requestFingerprint = useMemo(() => {
    return sha256({
      contractVersion: 'v1',
      canonicalInputHash,
      templateVersionId: BUILTIN_FLYER_TEMPLATE_V1.canonicalHash,
      variantVersionId: `crv-variant-${version}`,
      platform,
    });
  }, [canonicalInputHash, version, platform]);

  const handlePlatformChange = (nextPlatform: PlatformPreset) => {
    setPlatform(nextPlatform);
    if (isApproved) {
      setIsApproved(false);
      setArtifactHash(null);
      setVersion(v => v + 1);
    }
  };

  const handleSlotChange = (setter: (val: string) => void, val: string) => {
    setter(val);
    if (isApproved) {
      setIsApproved(false);
      setArtifactHash(null);
      setVersion(v => v + 1);
    }
  };

  const handleSelectBrand = (brand: BrandKit) => {
    setSelectedBrand(brand);
    setCustomHeadingFont(brand.typography.headingFont);
    setCustomBodyFont(brand.typography.bodyFont);
    setCustomAccentFont(brand.typography.accentFont || 'JetBrains Mono');
    if (brand.watermarkConfig) {
      setWatermark(brand.watermarkConfig);
    }
    if (isApproved) {
      setIsApproved(false);
      setArtifactHash(null);
      setVersion(v => v + 1);
    }
  };

  const handleSeedColorChange = (seedHex: string) => {
    const isDarkBg = getRelativeLuminance(selectedBrand.colors.background) < 0.2;
    const derived = extractPaletteFromSeed(seedHex, isDarkBg ? 'dark' : 'light');
    setSelectedBrand(b => ({
      ...b,
      colors: {
        ...b.colors,
        primary: derived.primary,
        secondary: derived.secondary,
        accent: derived.accent,
      },
    }));
    if (isApproved) {
      setIsApproved(false);
      setArtifactHash(null);
      setVersion(v => v + 1);
    }
  };

  const handleCanvasElementClick = (slotName: string) => {
    setFocusedSlot(slotName);
    if (slotName === 'headline') headlineInputRef.current?.focus();
    else if (slotName === 'body') bodyInputRef.current?.focus();
    else if (slotName === 'logo') logoAltInputRef.current?.focus();
    else if (slotName === 'hero') heroAltInputRef.current?.focus();
    else if (slotName === 'cta') ctaLabelInputRef.current?.focus();
    else if (slotName === 'contact') contactInputRef.current?.focus();
  };

  // Real-Time Render Streaming Handler
  const handleApproveAndRender = async () => {
    setIsRendering(true);
    setStreamProgress(5);
    setStreamStage('queued');
    setStreamMessage('Initializing render request stream...');

    const renderRequest: RenderRequest = {
      contractVersion: 'v1',
      renderJobId: `job-stream-${Date.now()}`,
      correlationId: `corr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      idempotencyKey: `idem-stream-${requestFingerprint}`,
      canonicalInputHash,
      templateVersionId: BUILTIN_FLYER_TEMPLATE_V1.canonicalHash,
      variantVersionId: `crv-variant-${version}`,
      assetContentHashes: [
        'sha256:3333333333333333333333333333333333333333333333333333333333333333',
        'sha256:4444444444444444444444444444444444444444444444444444444444444444',
      ],
      assetGrants: {
        'asset-logo': {
          assetId: 'asset-logo',
          contentHash: 'sha256:3333333333333333333333333333333333333333333333333333333333333333',
          grantToken: 'grant-tok-sec',
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          mediaType: 'image/png',
        },
        'asset-diagram': {
          assetId: 'asset-diagram',
          contentHash: 'sha256:4444444444444444444444444444444444444444444444444444444444444444',
          grantToken: 'grant-tok-sec-2',
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          mediaType: 'image/png',
        },
      },
      resolvedSlots: {
        'slot-headline': { type: 'text', content: headline },
        'slot-body': { type: 'text', content: bodyText },
        'slot-logo': {
          type: 'logo',
          assetId: selectedBrand.logoAssetId || 'asset-logo',
          assetHash: 'sha256:3333333333333333333333333333333333333333333333333333333333333333',
          altText: logoAlt,
        },
        'slot-hero-image': {
          type: 'image',
          assetId: 'asset-diagram',
          assetHash: 'sha256:4444444444444444444444444444444444444444444444444444444444444444',
          altText: heroAlt,
        },
        'slot-cta': { type: 'cta', label: ctaLabel, url: ctaUrl },
        'slot-contact': { type: 'contact', text: contactInfo },
      },
      target: {
        platform: (platform === 'linkedin'
          ? 'linkedin'
          : platform === 'instagram' || platform === 'story'
            ? 'instagram'
            : 'generic') as SupportedPlatform,
        mediaType: 'image/png',
        dimensions:
          platform === 'linkedin'
            ? { width: 1200, height: 627, unit: 'px', dpi: 72 }
            : platform === 'story'
              ? { width: 1080, height: 1920, unit: 'px', dpi: 72 }
              : { width: 1080, height: 1080, unit: 'px', dpi: 72 },
      },
      deadline: new Date(Date.now() + 60000).toISOString(),
    };

    try {
      const result = await executeStreamingRender(
        renderRequest,
        {
          onEvent: (evt: RenderStreamEvent) => {
            setStreamProgress(evt.progress);
            setStreamStage(evt.stage);
            setStreamMessage(evt.message);
          },
        },
        120
      );

      if (result.status === 'succeeded' && result.artifactHash) {
        setIsApproved(true);
        setArtifactHash(result.artifactHash);
        setIsRendering(false);

        // Add to Asset Library
        const newAssetEntry: RenderedAssetEntry = {
          id: `asset-rendered-${Date.now()}`,
          campaignId: campaignId || 'camp-pilot',
          variantVersionId: `crv-variant-${version}`,
          templateVersionHash: BUILTIN_FLYER_TEMPLATE_V1.canonicalHash,
          canonicalInputHash,
          artifactHash: result.artifactHash,
          storageReference: result.artifactStorageReference || 'artifacts/creative/latest.png',
          platform: (platform === 'linkedin'
            ? 'linkedin'
            : platform === 'instagram' || platform === 'story'
              ? 'instagram'
              : 'generic') as SupportedPlatform,
          dimensions: result.dimensions || renderRequest.target.dimensions,
          brandName: selectedBrand.name,
          version,
          headline,
          createdAt: new Date().toISOString(),
        };

        setRenderedAssets(prev => [newAssetEntry, ...prev]);

        toast.success('Mill rendered verified artifact!', 5000, {
          label: 'Copy Hash',
          onClick: () => copyToClipboard(result.artifactHash!, 'Artifact Hash'),
        });

        onApprovalComplete?.({
          artifactHash: result.artifactHash,
          canonicalInputHash,
          approvalId: `appr-crv-${Date.now()}`,
        });
      } else {
        setIsRendering(false);
        toast.error(`Render failed: ${result.errorMessage || 'Unknown error'}`);
      }
    } catch (err: unknown) {
      setIsRendering(false);
      const msg = err instanceof Error ? err.message : 'Render pipeline error';
      toast.error(`Streaming error: ${msg}`);
    }
  };

  const handleExport = (format: string) => {
    setDownloadSuccess(`Exported preview-${platform}.${format}`);
    toast.info(
      `Exporting ${format.toUpperCase()} asset (~${format === 'pdf' ? '1.4 MB' : '120 KB'})`
    );
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  const handleScheduleAsset = (
    assetId: string,
    targetPlatform: SupportedPlatform,
    slotTime: string
  ) => {
    setRenderedAssets(prev =>
      prev.map(asset => {
        if (asset.id === assetId) {
          return {
            ...asset,
            scheduledSlot: {
              platform: targetPlatform,
              slotTime,
              targetCampaignId: campaignId,
              scheduledAt: new Date().toISOString(),
            },
          };
        }
        return asset;
      })
    );
    toast.success(`Scheduled asset to ${targetPlatform} slot (${slotTime})!`, 4000);
  };

  const isAccessibilityValid = logoAlt.trim().length > 0 && heroAlt.trim().length > 0;

  // Render individual flyer canvas
  const renderCanvas = (targetPlatform: PlatformPreset, scale = 1) => {
    const isLandscape = targetPlatform === 'linkedin';
    const isStory = targetPlatform === 'story';

    const getWatermarkClass = (pos: WatermarkPosition) => {
      switch (pos) {
        case 'top-left':
          return styles.watermarkTopLeft;
        case 'top-right':
          return styles.watermarkTopRight;
        case 'bottom-left':
          return styles.watermarkBottomLeft;
        case 'center-stamp':
          return styles.watermarkCenterStamp;
        default:
          return styles.watermarkBottomRight;
      }
    };

    return (
      <div
        className={`${styles.canvasWrapper} ${
          isLandscape
            ? styles.canvasFlyerLandscape
            : isStory
              ? styles.canvasFlyerStory
              : styles.canvasFlyer
        }`}
        style={{
          transform: `scale(${scale})`,
          backgroundColor: selectedBrand.colors.background,
          borderColor: selectedBrand.colors.secondary,
          color: selectedBrand.colors.text,
          fontFamily: customBodyFont,
        }}
      >
        {/* Optional Watermark Overlay */}
        {watermark.enabled && (
          <div
            className={`${styles.canvasWatermark} ${getWatermarkClass(watermark.position)}`}
            style={{
              opacity: watermark.opacity,
              transform:
                watermark.position === 'center-stamp'
                  ? `translate(-50%, -50%) rotate(-15deg) scale(${watermark.scale})`
                  : `scale(${watermark.scale})`,
              fontFamily: customAccentFont,
            }}
          >
            {watermark.badgeText || `◈ ${selectedBrand.name}`}
          </div>
        )}

        <div className={styles.canvasHeader}>
          <div
            className={`${styles.canvasLogo} ${styles.interactiveCanvasSlot} ${focusedSlot === 'logo' ? styles.focusedSlot : ''}`}
            onClick={() => handleCanvasElementClick('logo')}
            style={{
              color: selectedBrand.colors.primary,
              borderColor: selectedBrand.colors.secondary,
              fontFamily: customHeadingFont,
            }}
          >
            ◈ {selectedBrand.name}
          </div>
          <span style={{ fontSize: '0.75rem', color: selectedBrand.colors.muted, fontWeight: 600 }}>
            v{version}
          </span>
        </div>

        <div>
          <div
            className={`${styles.canvasHeadline} ${styles.interactiveCanvasSlot} ${focusedSlot === 'headline' ? styles.focusedSlot : ''}`}
            onClick={() => handleCanvasElementClick('headline')}
            style={{ color: selectedBrand.colors.text, fontFamily: customHeadingFont }}
          >
            {headline}
          </div>
          <div
            className={`${styles.canvasBody} ${styles.interactiveCanvasSlot} ${focusedSlot === 'body' ? styles.focusedSlot : ''}`}
            onClick={() => handleCanvasElementClick('body')}
            style={{ color: selectedBrand.colors.muted }}
          >
            {bodyText}
          </div>
        </div>

        <div
          className={`${styles.canvasHeroGraphic} ${styles.interactiveCanvasSlot} ${focusedSlot === 'hero' ? styles.focusedSlot : ''}`}
          onClick={() => handleCanvasElementClick('hero')}
          style={{
            borderColor: selectedBrand.colors.primary,
            backgroundColor: `${selectedBrand.colors.primary}15`,
            color: selectedBrand.colors.text,
          }}
        >
          <strong>[Verified Provenance Architecture]</strong>
          <div style={{ fontSize: '0.75rem', marginTop: '4px', opacity: 0.85 }}>Alt: {heroAlt}</div>
        </div>

        <div className={styles.canvasFooter}>
          <span
            className={`${styles.canvasCtaButton} ${styles.interactiveCanvasSlot} ${focusedSlot === 'cta' ? styles.focusedSlot : ''}`}
            onClick={() => handleCanvasElementClick('cta')}
            style={{
              backgroundColor: selectedBrand.colors.primary,
              color: '#ffffff',
              fontFamily: customHeadingFont,
            }}
          >
            {ctaLabel} →
          </span>
          <span
            className={`${styles.canvasContact} ${styles.interactiveCanvasSlot} ${focusedSlot === 'contact' ? styles.focusedSlot : ''}`}
            onClick={() => handleCanvasElementClick('contact')}
            style={{ color: selectedBrand.colors.muted, fontFamily: customAccentFont }}
          >
            {contactInfo}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.composerContainer}>
      {/* Header Bar */}
      <div className={styles.composerHeader}>
        <div className={styles.headerInfo}>
          <h2>Creative Composer Studio</h2>
          <p>
            Campaign: <strong>{campaignId}</strong> • Brand: <strong>{selectedBrand.name}</strong>{' '}
            (v{version})
          </p>
        </div>

        <div className={styles.headerActions}>
          <div className={styles.platformSelector} role="group" aria-label="View Mode">
            <button
              type="button"
              className={`${styles.platformButton} ${viewMode === 'single' ? styles.platformActive : ''}`}
              onClick={() => setViewMode('single')}
            >
              Focus View
            </button>
            <button
              type="button"
              className={`${styles.platformButton} ${viewMode === 'matrix' ? styles.platformActive : ''}`}
              onClick={() => setViewMode('matrix')}
            >
              3-Platform Matrix
            </button>
            <button
              type="button"
              className={`${styles.platformButton} ${viewMode === 'gallery' ? styles.platformActive : ''}`}
              onClick={() => setViewMode('gallery')}
            >
              Asset Library ({renderedAssets.length})
            </button>
          </div>

          {viewMode === 'single' && (
            <div className={styles.platformSelector} role="group" aria-label="Target Platform">
              <button
                type="button"
                className={`${styles.platformButton} ${platform === 'linkedin' ? styles.platformActive : ''}`}
                onClick={() => handlePlatformChange('linkedin')}
              >
                LinkedIn
              </button>
              <button
                type="button"
                className={`${styles.platformButton} ${platform === 'instagram' ? styles.platformActive : ''}`}
                onClick={() => handlePlatformChange('instagram')}
              >
                Instagram
              </button>
              <button
                type="button"
                className={`${styles.platformButton} ${platform === 'story' ? styles.platformActive : ''}`}
                onClick={() => handlePlatformChange('story')}
              >
                Story
              </button>
            </div>
          )}

          <button
            type="button"
            className={styles.actionButtonPrimary}
            onClick={handleApproveAndRender}
            disabled={!isAccessibilityValid || isRendering}
          >
            {isRendering
              ? `Rendering (${streamProgress}%)...`
              : isApproved
                ? '✓ Approved & Rendered'
                : 'Approve & Render'}
          </button>
        </div>
      </div>

      {/* SSE Streaming Live Status Indicator */}
      {isRendering && (
        <div className={styles.streamProgressContainer}>
          <div className={styles.streamStatusText}>
            <span>
              <strong>Mill Adapter:</strong> {streamMessage}
            </span>
            <span className={styles.streamStagePill}>{streamStage}</span>
          </div>
          <div className={styles.streamProgressBarTrack}>
            <div className={styles.streamProgressBarFill} style={{ width: `${streamProgress}%` }} />
          </div>
        </div>
      )}

      {/* Main Studio Views */}
      {viewMode === 'gallery' ? (
        /* Asset Library / Media Grid View */
        <div className={styles.mediaGridContainer}>
          <div className={styles.mediaGridHeader}>
            <div>
              <h3 className={styles.panelTitle}>Rendered Asset Gallery & Campaign Scheduler</h3>
              <p
                style={{
                  fontSize: '0.85rem',
                  color: 'var(--color-text-secondary)',
                  margin: '0.25rem 0 0',
                }}
              >
                All rendered flyer variants with deterministic hashes, storage links, and 1-click
                multi-platform scheduling.
              </p>
            </div>
            <button
              type="button"
              className={styles.brandPill}
              onClick={() => toast.info('Exporting full campaign creative bundle (ZIP)...')}
            >
              Export All Assets (ZIP)
            </button>
          </div>

          <div className={styles.mediaGridList}>
            {renderedAssets.map(asset => (
              <div key={asset.id} className={styles.mediaCard}>
                <div className={styles.mediaCardHeader}>
                  <span className={styles.mediaCardTitle}>
                    {asset.platform.toUpperCase()} Flyer (v{asset.version})
                  </span>
                  <span className={styles.streamStagePill}>{asset.brandName}</span>
                </div>

                <div className={styles.mediaCardMeta}>
                  <span>
                    {asset.dimensions.width}×{asset.dimensions.height} {asset.dimensions.unit}
                  </span>
                  <span>•</span>
                  <span>{new Date(asset.createdAt).toLocaleTimeString()}</span>
                </div>

                <div className={styles.hashBadge} style={{ fontSize: '0.7rem' }}>
                  {asset.artifactHash}
                </div>

                {asset.scheduledSlot ? (
                  <div className={styles.scheduleBadge}>
                    ✓ Scheduled for {new Date(asset.scheduledSlot.slotTime).toLocaleDateString()} at{' '}
                    {new Date(asset.scheduledSlot.slotTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                ) : (
                  <div className={styles.scheduleDrawer}>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        color: 'var(--color-text-secondary)',
                      }}
                    >
                      1-Click Campaign Slot Scheduling:
                    </span>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        className={styles.brandPill}
                        style={{ fontSize: '0.75rem' }}
                        onClick={() =>
                          handleScheduleAsset(
                            asset.id,
                            asset.platform,
                            new Date(Date.now() + 86400000).toISOString()
                          )
                        }
                      >
                        + Tomorrow 09:00 AM
                      </button>
                      <button
                        type="button"
                        className={styles.brandPill}
                        style={{ fontSize: '0.75rem' }}
                        onClick={() =>
                          handleScheduleAsset(
                            asset.id,
                            asset.platform,
                            new Date(Date.now() + 172800000).toISOString()
                          )
                        }
                      >
                        + Friday 14:00 PM
                      </button>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
                  <button
                    type="button"
                    className={styles.exportBtn}
                    style={{ flex: 1 }}
                    onClick={() => copyToClipboard(asset.artifactHash, 'Artifact Hash')}
                  >
                    Copy Hash
                  </button>
                  <button
                    type="button"
                    className={styles.exportBtn}
                    style={{ flex: 1 }}
                    onClick={() => handleExport('png')}
                  >
                    Download PNG
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Studio Canvas & Diagnostics Layout */
        <div className={styles.studioLayout}>
          {/* Left Column: Slot & Brand Controls */}
          <div className={styles.editorPanel}>
            <h3 className={styles.panelTitle}>Brand & Content Slots</h3>

            {/* Brand Presets */}
            <div className={styles.slotGroup}>
              <label className={styles.slotLabel}>Tenant Brand Theme</label>
              <div className={styles.brandSelector}>
                {ALL_BRAND_KIT_PRESETS.map(brand => (
                  <button
                    key={brand.id}
                    type="button"
                    className={`${styles.brandPill} ${selectedBrand.id === brand.id ? styles.brandPillActive : ''}`}
                    onClick={() => handleSelectBrand(brand)}
                  >
                    {brand.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Palette Extraction & Contrast Scorecard */}
            <div className={styles.paletteSection}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <label className={styles.slotLabel}>Palette & Contrast</label>
                <span
                  className={`${styles.contrastBadge} ${
                    wcagScore.badge === 'AAA'
                      ? styles.contrastAAA
                      : wcagScore.badge === 'AA' || wcagScore.badge === 'AA Large'
                        ? styles.contrastAA
                        : styles.contrastFail
                  }`}
                >
                  {wcagScore.badge} ({contrastRatio}:1)
                </span>
              </div>
              <div className={styles.paletteRow}>
                <input
                  type="color"
                  className={styles.colorSwatchInput}
                  value={selectedBrand.colors.primary}
                  onChange={e => handleSeedColorChange(e.target.value)}
                  title="Pick Primary Color"
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                  Primary: <strong>{selectedBrand.colors.primary}</strong>
                </span>
              </div>
            </div>

            {/* Typography Controls */}
            <div className={styles.slotGroup}>
              <label className={styles.slotLabel}>Heading Font</label>
              <select
                className={styles.slotSelect}
                value={customHeadingFont}
                onChange={e => handleSlotChange(setCustomHeadingFont, e.target.value)}
              >
                {AVAILABLE_FONTS.headings.map(font => (
                  <option key={font} value={font}>
                    {font}
                  </option>
                ))}
              </select>
            </div>

            {/* Logo Watermark Configuration */}
            <div className={styles.slotGroup}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <label className={styles.slotLabel}>Logo Watermark</label>
                <label
                  style={{
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={watermark.enabled}
                    onChange={e =>
                      setWatermark(w => ({
                        ...w,
                        enabled: e.target.checked,
                      }))
                    }
                  />
                  Enable
                </label>
              </div>
              {watermark.enabled && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select
                    className={styles.slotSelect}
                    value={watermark.position}
                    onChange={e =>
                      setWatermark(w => ({
                        ...w,
                        position: e.target.value as WatermarkPosition,
                      }))
                    }
                  >
                    <option value="top-left">Top Left</option>
                    <option value="top-right">Top Right</option>
                    <option value="bottom-left">Bottom Left</option>
                    <option value="bottom-right">Bottom Right</option>
                    <option value="center-stamp">Center Stamp</option>
                  </select>
                </div>
              )}
            </div>

            {/* Content Slots */}
            <div className={styles.slotGroup}>
              <label className={styles.slotLabel} htmlFor="slot-headline-input">
                Headline
              </label>
              <input
                ref={headlineInputRef}
                id="slot-headline-input"
                className={styles.slotInput}
                value={headline}
                onFocus={() => setFocusedSlot('headline')}
                onBlur={() => setFocusedSlot(null)}
                onChange={e => handleSlotChange(setHeadline, e.target.value)}
                placeholder="Enter announcement headline..."
              />
            </div>

            <div className={styles.slotGroup}>
              <label className={styles.slotLabel} htmlFor="slot-body-input">
                Body Text
              </label>
              <textarea
                ref={bodyInputRef}
                id="slot-body-input"
                className={styles.slotTextarea}
                value={bodyText}
                onFocus={() => setFocusedSlot('body')}
                onBlur={() => setFocusedSlot(null)}
                onChange={e => handleSlotChange(setBodyText, e.target.value)}
                placeholder="Enter body content description..."
              />
            </div>

            <div className={styles.slotGroup}>
              <label className={styles.slotLabel} htmlFor="slot-logo-alt">
                Logo Alt-Text (Required)
              </label>
              <input
                ref={logoAltInputRef}
                id="slot-logo-alt"
                className={styles.slotInput}
                value={logoAlt}
                onFocus={() => setFocusedSlot('logo')}
                onBlur={() => setFocusedSlot(null)}
                onChange={e => handleSlotChange(setLogoAlt, e.target.value)}
                placeholder="Describe logo for screen readers..."
              />
            </div>

            <div className={styles.slotGroup}>
              <label className={styles.slotLabel} htmlFor="slot-hero-alt">
                Hero Visual Alt-Text (Required)
              </label>
              <input
                ref={heroAltInputRef}
                id="slot-hero-alt"
                className={styles.slotInput}
                value={heroAlt}
                onFocus={() => setFocusedSlot('hero')}
                onBlur={() => setFocusedSlot(null)}
                onChange={e => handleSlotChange(setHeroAlt, e.target.value)}
                placeholder="Describe diagram/image..."
              />
            </div>

            <div className={styles.slotGroup}>
              <label className={styles.slotLabel} htmlFor="slot-cta-label">
                CTA Button Label
              </label>
              <input
                ref={ctaLabelInputRef}
                id="slot-cta-label"
                className={styles.slotInput}
                value={ctaLabel}
                onFocus={() => setFocusedSlot('cta')}
                onBlur={() => setFocusedSlot(null)}
                onChange={e => handleSlotChange(setCtaLabel, e.target.value)}
              />
            </div>

            <div className={styles.slotGroup}>
              <label className={styles.slotLabel} htmlFor="slot-contact-input">
                Contact / Support
              </label>
              <input
                ref={contactInputRef}
                id="slot-contact-input"
                className={styles.slotInput}
                value={contactInfo}
                onFocus={() => setFocusedSlot('contact')}
                onBlur={() => setFocusedSlot(null)}
                onChange={e => handleSlotChange(setContactInfo, e.target.value)}
              />
            </div>
          </div>

          {/* Center Column: Live Visual Canvas */}
          <div className={styles.canvasContainer}>
            {viewMode === 'single' ? (
              renderCanvas(platform)
            ) : (
              <div className={styles.matrixGrid}>
                <div className={styles.matrixCard}>
                  <span className={styles.matrixLabel}>LinkedIn (1200×627)</span>
                  {renderCanvas('linkedin', 0.65)}
                </div>
                <div className={styles.matrixCard}>
                  <span className={styles.matrixLabel}>Instagram (1080×1080)</span>
                  {renderCanvas('instagram', 0.65)}
                </div>
                <div className={styles.matrixCard}>
                  <span className={styles.matrixLabel}>Story (1080×1920)</span>
                  {renderCanvas('story', 0.65)}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Governance, Diagnostics & Proofs */}
          <div className={styles.diagnosticsPanel}>
            <h3 className={styles.panelTitle}>Governance & Proofs</h3>

            <div className={styles.diagnosticsCard}>
              <span className={styles.diagTitle}>Accessibility Scorecard</span>
              <div className={styles.successChip}>
                {isAccessibilityValid ? '✓ WCAG 2.1 AA Compliant' : '⚠ Missing Alt-Text'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
                Contrast: {contrastRatio}:1 ({wcagScore.badge}) • 6 Slots Bound
              </div>
            </div>

            <div className={styles.diagnosticsCard}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span className={styles.diagTitle}>Canonical Input Hash</span>
                <button
                  type="button"
                  className={styles.brandPill}
                  style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}
                  onClick={() => copyToClipboard(canonicalInputHash, 'Canonical Input Hash')}
                >
                  Copy
                </button>
              </div>
              <div className={styles.hashBadge}>{canonicalInputHash}</div>
            </div>

            <div className={styles.diagnosticsCard}>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span className={styles.diagTitle}>Mill Request Fingerprint</span>
                <button
                  type="button"
                  className={styles.brandPill}
                  style={{ fontSize: '0.7rem', padding: '0.15rem 0.45rem' }}
                  onClick={() => copyToClipboard(requestFingerprint, 'Request Fingerprint')}
                >
                  Copy
                </button>
              </div>
              <div className={styles.hashBadge}>{requestFingerprint}</div>
            </div>

            {artifactHash ? (
              <div
                className={styles.diagnosticsCard}
                style={{ borderColor: 'var(--color-success)' }}
              >
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <span className={styles.diagTitle}>Deterministic Artifact Hash</span>
                  <button
                    type="button"
                    className={styles.brandPill}
                    style={{
                      fontSize: '0.7rem',
                      padding: '0.15rem 0.45rem',
                      borderColor: 'var(--color-success)',
                      color: 'var(--color-success)',
                    }}
                    onClick={() => copyToClipboard(artifactHash, 'Artifact Hash')}
                  >
                    Copy
                  </button>
                </div>
                <div className={styles.hashBadge} style={{ color: 'var(--color-success)' }}>
                  {artifactHash}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                  Renderer: Mill v1.0.0 (Deterministic)
                </div>
              </div>
            ) : null}

            {/* Export Hub */}
            <div className={styles.diagnosticsCard}>
              <span className={styles.diagTitle}>Export Hub</span>
              {downloadSuccess && (
                <div
                  style={{ fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 600 }}
                >
                  ✓ {downloadSuccess}
                </div>
              )}
              <div className={styles.exportHub}>
                <button
                  type="button"
                  className={styles.exportBtn}
                  onClick={() => handleExport('webp')}
                >
                  <span>WebP</span>
                  <span className={styles.exportSize}>~120 KB</span>
                </button>
                <button
                  type="button"
                  className={styles.exportBtn}
                  onClick={() => handleExport('png')}
                >
                  <span>PNG (Lossless)</span>
                  <span className={styles.exportSize}>~480 KB</span>
                </button>
                <button
                  type="button"
                  className={styles.exportBtn}
                  onClick={() => handleExport('svg')}
                >
                  <span>Vector SVG</span>
                  <span className={styles.exportSize}>~24 KB</span>
                </button>
                <button
                  type="button"
                  className={styles.exportBtn}
                  onClick={() => handleExport('pdf')}
                >
                  <span>Print PDF</span>
                  <span className={styles.exportSize}>~1.4 MB</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default CreativeComposer;
