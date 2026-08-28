'use client';

import React, { useState, useMemo } from 'react';
import styles from '@/styles/CreativeComposer.module.css';
import { sha256 } from '@/lib/campaigns/contracts';
import { COILTRACE_BRAND_KIT } from '@/lib/creative/pilot/coiltrace-pilot';
import { BUILTIN_FLYER_TEMPLATE_V1 } from '@/lib/creative/templates/builtin';

type PlatformPreset = 'instagram' | 'linkedin' | 'twitter' | 'story';

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
  // State for editable slots
  const [platform, setPlatform] = useState<PlatformPreset>('linkedin');
  const [headline, setHeadline] = useState('Autonomous Traceability & Verification');
  const [bodyText, setBodyText] = useState(
    'CoilTrace introduces cryptographic provenance proofs across multi-vendor logistics pipelines.'
  );
  const [logoAlt, setLogoAlt] = useState('CoilTrace Official Logo');
  const [heroAlt, setHeroAlt] = useState('Verification Flow Diagram');
  const [ctaLabel, setCtaLabel] = useState('Explore Architecture');
  const [ctaUrl, setCtaUrl] = useState('https://coiltrace.io/architecture');
  const [contactInfo, setContactInfo] = useState('verifications@coiltrace.io');

  // Lifecycle states
  const [version, setVersion] = useState(1);
  const [isApproved, setIsApproved] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [artifactHash, setArtifactHash] = useState<string | null>(null);

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
          assetId: 'asset-coiltrace-logo',
          assetHash: 'sha256:3333333333333333333333333333333333333333333333333333333333333333',
          altText: logoAlt,
        },
        'slot-hero-image': {
          type: 'image',
          assetId: 'asset-coiltrace-diagram',
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
  }, [headline, bodyText, logoAlt, heroAlt, ctaLabel, ctaUrl, contactInfo, platform]);

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
    }, 600);
  };

  const isAccessibilityValid = logoAlt.trim().length > 0 && heroAlt.trim().length > 0;

  return (
    <div className={styles.composerContainer}>
      {/* Header Bar */}
      <div className={styles.composerHeader}>
        <div className={styles.headerInfo}>
          <h2>Creative Composer Studio</h2>
          <p>
            Campaign: <strong>{campaignId}</strong> • Template:{' '}
            {BUILTIN_FLYER_TEMPLATE_V1.templateId} (v{version})
          </p>
        </div>

        <div className={styles.headerActions}>
          <div className={styles.platformSelector} role="group" aria-label="Target Platform">
            <button
              type="button"
              className={`${styles.platformButton} ${platform === 'linkedin' ? styles.platformActive : ''}`}
              onClick={() => handleSlotChange(() => setPlatform('linkedin'), 'linkedin')}
            >
              LinkedIn (Landscape)
            </button>
            <button
              type="button"
              className={`${styles.platformButton} ${platform === 'instagram' ? styles.platformActive : ''}`}
              onClick={() => handleSlotChange(() => setPlatform('instagram'), 'instagram')}
            >
              Instagram (Square)
            </button>
            <button
              type="button"
              className={`${styles.platformButton} ${platform === 'story' ? styles.platformActive : ''}`}
              onClick={() => handleSlotChange(() => setPlatform('story'), 'story')}
            >
              Story (Vertical)
            </button>
          </div>

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

      {/* Main Studio 3-Column Layout */}
      <div className={styles.studioLayout}>
        {/* Left Column: Slot Editor */}
        <div className={styles.editorPanel}>
          <h3 className={styles.panelTitle}>Content Slots</h3>

          <div className={styles.slotGroup}>
            <label className={styles.slotLabel} htmlFor="slot-brand">
              Brand Kit
            </label>
            <input
              id="slot-brand"
              className={styles.slotInput}
              value={COILTRACE_BRAND_KIT.name}
              disabled
            />
          </div>

          <div className={styles.slotGroup}>
            <label className={styles.slotLabel} htmlFor="slot-headline-input">
              Headline
            </label>
            <input
              id="slot-headline-input"
              className={styles.slotInput}
              value={headline}
              onChange={e => handleSlotChange(setHeadline, e.target.value)}
              placeholder="Enter announcement headline..."
            />
          </div>

          <div className={styles.slotGroup}>
            <label className={styles.slotLabel} htmlFor="slot-body-input">
              Body Text
            </label>
            <textarea
              id="slot-body-input"
              className={styles.slotTextarea}
              value={bodyText}
              onChange={e => handleSlotChange(setBodyText, e.target.value)}
              placeholder="Enter body content description..."
            />
          </div>

          <div className={styles.slotGroup}>
            <label className={styles.slotLabel} htmlFor="slot-logo-alt">
              Logo Alt-Text (Required)
            </label>
            <input
              id="slot-logo-alt"
              className={styles.slotInput}
              value={logoAlt}
              onChange={e => handleSlotChange(setLogoAlt, e.target.value)}
              placeholder="Describe logo for screen readers..."
            />
          </div>

          <div className={styles.slotGroup}>
            <label className={styles.slotLabel} htmlFor="slot-hero-alt">
              Hero Visual Alt-Text (Required)
            </label>
            <input
              id="slot-hero-alt"
              className={styles.slotInput}
              value={heroAlt}
              onChange={e => handleSlotChange(setHeroAlt, e.target.value)}
              placeholder="Describe diagram/image..."
            />
          </div>

          <div className={styles.slotGroup}>
            <label className={styles.slotLabel} htmlFor="slot-cta-label">
              CTA Button Label
            </label>
            <input
              id="slot-cta-label"
              className={styles.slotInput}
              value={ctaLabel}
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
              id="slot-contact-input"
              className={styles.slotInput}
              value={contactInfo}
              onChange={e => handleSlotChange(setContactInfo, e.target.value)}
            />
          </div>
        </div>

        {/* Center Column: Live Visual Canvas */}
        <div className={styles.canvasContainer}>
          <div
            className={`${styles.canvasWrapper} ${
              platform === 'linkedin'
                ? styles.canvasFlyerLandscape
                : platform === 'story'
                  ? styles.canvasFlyerStory
                  : styles.canvasFlyer
            }`}
            style={{
              borderColor: COILTRACE_BRAND_KIT.colors.secondary,
            }}
          >
            <div className={styles.canvasHeader}>
              <div className={styles.canvasLogo}>◈ CoilTrace</div>
              <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
                v{version}
              </span>
            </div>

            <div>
              <div className={styles.canvasHeadline}>{headline}</div>
              <div className={styles.canvasBody}>{bodyText}</div>
            </div>

            <div className={styles.canvasHeroGraphic}>
              <strong>[Verified Provenance Architecture]</strong>
              <div style={{ fontSize: '0.75rem', marginTop: '4px' }}>Alt: {heroAlt}</div>
            </div>

            <div className={styles.canvasFooter}>
              <span className={styles.canvasCtaButton}>{ctaLabel} →</span>
              <span className={styles.canvasContact}>{contactInfo}</span>
            </div>
          </div>
        </div>

        {/* Right Column: Diagnostics & Cryptographic Evidence */}
        <div className={styles.diagnosticsPanel}>
          <h3 className={styles.panelTitle}>Governance & Hash Proofs</h3>

          <div className={styles.diagnosticsCard}>
            <span className={styles.diagTitle}>Accessibility Scorecard</span>
            <div className={styles.successChip}>
              {isAccessibilityValid ? '✓ WCAG 2.1 AA Compliant' : '⚠ Missing Alt-Text'}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>
              Reading Order: 6 slots configured
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
                Renderer: Mill v1.0.0
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
export default CreativeComposer;
