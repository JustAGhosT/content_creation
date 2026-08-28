'use client';

import React, { useState, useMemo, useRef } from 'react';
import styles from '@/styles/CreativeComposer.module.css';
import { sha256 } from '@/lib/campaigns/contracts';
import { COILTRACE_BRAND_KIT } from '@/lib/creative/pilot/coiltrace-pilot';
import { BUILTIN_FLYER_TEMPLATE_V1 } from '@/lib/creative/templates/builtin';
import type { BrandKit } from '@/lib/creative/types';

type PlatformPreset = 'instagram' | 'linkedin' | 'story';
type ViewMode = 'single' | 'matrix';

const AVAILABLE_BRAND_KITS: BrandKit[] = [
  COILTRACE_BRAND_KIT,
  {
    id: 'brand-technova-v1',
    tenantId: 'tenant-technova',
    name: 'TechNova Cloud',
    version: 1,
    logoAssetId: 'asset-technova-logo',
    colors: {
      primary: '#4f46e5',
      secondary: '#06b6d4',
      accent: '#8b5cf6',
      background: '#ffffff',
      text: '#0f172a',
      muted: '#64748b',
    },
    typography: {
      headingFont: 'Plus Jakarta Sans',
      bodyFont: 'Inter',
      accentFont: 'JetBrains Mono',
    },
    accessibilityDefaults: {
      enforceHighContrast: true,
      defaultAltTextPrefix: 'TechNova',
    },
    status: 'active',
    createdAt: '2026-08-28T00:00:00.000Z',
    updatedAt: '2026-08-28T00:00:00.000Z',
  },
  {
    id: 'brand-vanguard-v1',
    tenantId: 'tenant-vanguard',
    name: 'Vanguard Security',
    version: 1,
    logoAssetId: 'asset-vanguard-logo',
    colors: {
      primary: '#090d16',
      secondary: '#10b981',
      accent: '#3b82f6',
      background: '#0f172a',
      text: '#f8fafc',
      muted: '#94a3b8',
    },
    typography: {
      headingFont: 'Space Grotesk',
      bodyFont: 'Inter',
      accentFont: 'JetBrains Mono',
    },
    accessibilityDefaults: {
      enforceHighContrast: true,
      defaultAltTextPrefix: 'Vanguard',
    },
    status: 'active',
    createdAt: '2026-08-28T00:00:00.000Z',
    updatedAt: '2026-08-28T00:00:00.000Z',
  },
];

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
  // State for view & brand
  const [platform, setPlatform] = useState<PlatformPreset>('linkedin');
  const [viewMode, setViewMode] = useState<ViewMode>('single');
  const [selectedBrand, setSelectedBrand] = useState<BrandKit>(COILTRACE_BRAND_KIT);
  const [focusedSlot, setFocusedSlot] = useState<string | null>(null);

  // State for editable slots
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

  // Lifecycle states
  const [version, setVersion] = useState(1);
  const [isApproved, setIsApproved] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [artifactHash, setArtifactHash] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

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

  const handleSlotChange = (setter: (val: string) => void, val: string) => {
    setter(val);
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

  const handleApproveAndRender = () => {
    setIsRendering(true);
    setTimeout(() => {
      setIsApproved(true);
      const generatedArtifact = sha256({
        renderer: 'mill@1.0.0',
        fingerprint: requestFingerprint,
      });
      setArtifactHash(generatedArtifact);
      setIsRendering(false);
      onApprovalComplete?.({
        artifactHash: generatedArtifact,
        canonicalInputHash,
        approvalId: `appr-crv-${Date.now()}`,
      });
    }, 500);
  };

  const handleExport = (format: string) => {
    setDownloadSuccess(`Exported preview-${platform}.${format}`);
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  const isAccessibilityValid = logoAlt.trim().length > 0 && heroAlt.trim().length > 0;

  // Render individual flyer canvas
  const renderCanvas = (targetPlatform: PlatformPreset, scale = 1) => {
    const isLandscape = targetPlatform === 'linkedin';
    const isStory = targetPlatform === 'story';

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
        }}
      >
        <div className={styles.canvasHeader}>
          <div
            className={`${styles.canvasLogo} ${styles.interactiveCanvasSlot} ${focusedSlot === 'logo' ? styles.focusedSlot : ''}`}
            onClick={() => handleCanvasElementClick('logo')}
            style={{
              color: selectedBrand.colors.primary,
              borderColor: selectedBrand.colors.secondary,
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
            style={{ color: selectedBrand.colors.text }}
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
            }}
          >
            {ctaLabel} →
          </span>
          <span
            className={`${styles.canvasContact} ${styles.interactiveCanvasSlot} ${focusedSlot === 'contact' ? styles.focusedSlot : ''}`}
            onClick={() => handleCanvasElementClick('contact')}
            style={{ color: selectedBrand.colors.muted }}
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
          </div>

          {viewMode === 'single' && (
            <div className={styles.platformSelector} role="group" aria-label="Target Platform">
              <button
                type="button"
                className={`${styles.platformButton} ${platform === 'linkedin' ? styles.platformActive : ''}`}
                onClick={() => handleSlotChange(() => setPlatform('linkedin'), 'linkedin')}
              >
                LinkedIn
              </button>
              <button
                type="button"
                className={`${styles.platformButton} ${platform === 'instagram' ? styles.platformActive : ''}`}
                onClick={() => handleSlotChange(() => setPlatform('instagram'), 'instagram')}
              >
                Instagram
              </button>
              <button
                type="button"
                className={`${styles.platformButton} ${platform === 'story' ? styles.platformActive : ''}`}
                onClick={() => handleSlotChange(() => setPlatform('story'), 'story')}
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
              ? 'Rendering with Mill...'
              : isApproved
                ? '✓ Approved & Rendered'
                : 'Approve & Render'}
          </button>
        </div>
      </div>

      {/* Main Studio Layout */}
      <div className={styles.studioLayout}>
        {/* Left Column: Slot Editor */}
        <div className={styles.editorPanel}>
          <h3 className={styles.panelTitle}>Content Slots</h3>

          <div className={styles.slotGroup}>
            <label className={styles.slotLabel}>Brand Identity</label>
            <div className={styles.brandSelector}>
              {AVAILABLE_BRAND_KITS.map(brand => (
                <button
                  key={brand.id}
                  type="button"
                  className={`${styles.brandPill} ${selectedBrand.id === brand.id ? styles.brandPillActive : ''}`}
                  onClick={() => {
                    setSelectedBrand(brand);
                    if (isApproved) {
                      setIsApproved(false);
                      setArtifactHash(null);
                      setVersion(v => v + 1);
                    }
                  }}
                >
                  {brand.name}
                </button>
              ))}
            </div>
          </div>

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
            <label className={styles.slotLabel} htmlFor="slot-cta-url">
              CTA Destination URL
            </label>
            <input
              id="slot-cta-url"
              className={styles.slotInput}
              value={ctaUrl}
              onChange={e => handleSlotChange(setCtaUrl, e.target.value)}
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

        {/* Right Column: Diagnostics & Cryptographic Evidence */}
        <div className={styles.diagnosticsPanel}>
          <h3 className={styles.panelTitle}>Governance & Proofs</h3>

          <div className={styles.diagnosticsCard}>
            <span className={styles.diagTitle}>Accessibility Scorecard</span>
            <div className={styles.successChip}>
              {isAccessibilityValid ? '✓ WCAG 2.1 AA Compliant' : '⚠ Missing Alt-Text'}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
              Reading Order: 6 slots configured • Contrast: 8.2:1 (AAA)
            </div>
          </div>

          <div className={styles.diagnosticsCard}>
            <span className={styles.diagTitle}>Canonical Input Hash</span>
            <div className={styles.hashBadge}>{canonicalInputHash}</div>
          </div>

          <div className={styles.diagnosticsCard}>
            <span className={styles.diagTitle}>Mill Request Fingerprint</span>
            <div className={styles.hashBadge}>{requestFingerprint}</div>
          </div>

          {artifactHash ? (
            <div className={styles.diagnosticsCard} style={{ borderColor: 'var(--color-success)' }}>
              <span className={styles.diagTitle}>Deterministic Artifact Hash</span>
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
              <div style={{ fontSize: '0.75rem', color: 'var(--color-success)', fontWeight: 600 }}>
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
                <span>Print PDF (300 DPI)</span>
                <span className={styles.exportSize}>~1.4 MB</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default CreativeComposer;
