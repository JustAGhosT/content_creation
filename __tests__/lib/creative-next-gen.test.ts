/**
 * Creative Studio Next-Gen Features Test Suite
 * Tests Real-Time Render Streaming, Palette Extraction & WCAG, and Brand Kit presets.
 */

import {
  extractPaletteFromSeed,
  getContrastRatio,
  evaluateWcagCompliance,
} from '@/lib/creative/palette';
import { ALL_BRAND_KIT_PRESETS, AVAILABLE_FONTS } from '@/lib/creative/presets';
import { executeStreamingRender, RenderStreamEvent } from '@/lib/creative/renderer/stream';
import { BUILTIN_FLYER_TEMPLATE_V1 } from '@/lib/creative/templates/builtin';
import type { RenderRequest } from '@/lib/creative/renderer/contracts';

describe('Creative Studio Next-Gen Features', () => {
  describe('Brand Kit Presets & Typography Registry', () => {
    it('provides all standard brand kit presets with valid structure and watermark defaults', () => {
      expect(ALL_BRAND_KIT_PRESETS.length).toBeGreaterThanOrEqual(6);

      for (const brand of ALL_BRAND_KIT_PRESETS) {
        expect(brand.id).toBeDefined();
        expect(brand.name).toBeDefined();
        expect(brand.colors.primary).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(brand.colors.background).toMatch(/^#[0-9a-fA-F]{6}$/);
        expect(brand.typography.headingFont).toBeDefined();
        expect(brand.typography.bodyFont).toBeDefined();
      }
    });

    it('exposes rich typography selections across heading, body, and accent categories', () => {
      expect(AVAILABLE_FONTS.headings).toContain('Plus Jakarta Sans');
      expect(AVAILABLE_FONTS.headings).toContain('Space Grotesk');
      expect(AVAILABLE_FONTS.bodies).toContain('Inter');
      expect(AVAILABLE_FONTS.accents).toContain('JetBrains Mono');
    });
  });

  describe('Palette Extraction & WCAG Contrast Evaluation', () => {
    it('correctly calculates contrast ratio and assigns WCAG AAA/AA badges', () => {
      // Black on White: ~21:1 -> AAA
      const highContrast = getContrastRatio('#000000', '#ffffff');
      expect(highContrast).toBeGreaterThanOrEqual(20);
      const highWcag = evaluateWcagCompliance(highContrast);
      expect(highWcag.aaaNormal).toBe(true);
      expect(highWcag.badge).toBe('AAA');

      // Light gray on white -> Fail
      const lowContrast = getContrastRatio('#e2e8f0', '#ffffff');
      const lowWcag = evaluateWcagCompliance(lowContrast);
      expect(lowWcag.aaNormal).toBe(false);
      expect(lowWcag.badge).toBe('Fail');
    });

    it('dynamically derives a cohesive palette from a single seed color', () => {
      const paletteLight = extractPaletteFromSeed('#4f46e5', 'light');
      expect(paletteLight.primary).toBe('#4f46e5');
      expect(paletteLight.background).toBe('#ffffff');
      expect(paletteLight.text).toBe('#0f172a');

      const paletteDark = extractPaletteFromSeed('#10b981', 'dark');
      expect(paletteDark.primary).toBe('#10b981');
      expect(paletteDark.background).toBe('#090d16');
      expect(paletteDark.text).toBe('#f8fafc');
    });
  });

  describe('Real-Time Render Streaming Pipeline', () => {
    it('emits progressive SSE render events through all stages from queued to completed', async () => {
      const recordedEvents: RenderStreamEvent[] = [];

      const testRequest: RenderRequest = {
        contractVersion: 'v1',
        renderJobId: 'job-test-streaming-1',
        idempotencyKey: 'idem-test-streaming-1',
        canonicalInputHash:
          'sha256:1111111111111111111111111111111111111111111111111111111111111111',
        templateVersionId: BUILTIN_FLYER_TEMPLATE_V1.canonicalHash,
        variantVersionId: 'crv-variant-test-1',
        assetContentHashes: [
          'sha256:3333333333333333333333333333333333333333333333333333333333333333',
        ],
        assetGrants: {
          'asset-logo': {
            assetId: 'asset-logo',
            contentHash: 'sha256:3333333333333333333333333333333333333333333333333333333333333333',
            grantToken: 'grant-test-1',
            expiresAt: new Date(Date.now() + 3600000).toISOString(),
            mediaType: 'image/png',
          },
        },
        resolvedSlots: {
          'slot-headline': { type: 'text', content: 'Next-Gen Streaming Verification' },
          'slot-logo': {
            type: 'logo',
            assetId: 'asset-logo',
            assetHash: 'sha256:3333333333333333333333333333333333333333333333333333333333333333',
            altText: 'Logo Alt Text',
          },
        },
        target: {
          platform: 'linkedin',
          mediaType: 'image/png',
          dimensions: { width: 1200, height: 627, unit: 'px', dpi: 72 },
        },
        correlationId: 'corr-test-streaming-1',
        deadline: new Date(Date.now() + 60000).toISOString(),
      };

      const result = await executeStreamingRender(
        testRequest,
        {
          onEvent: evt => {
            recordedEvents.push(evt);
          },
        },
        0 // 0 delay for fast unit testing
      );

      expect(result.status).toBe('succeeded');
      expect(result.artifactHash).toBeDefined();

      // Check progression of emitted events
      const stages = recordedEvents.map(e => e.stage);
      expect(stages).toContain('queued');
      expect(stages).toContain('validating_inputs');
      expect(stages).toContain('resolving_assets');
      expect(stages).toContain('rasterizing_canvas');
      expect(stages).toContain('computing_proofs');
      expect(stages).toContain('completed');

      // Validate monotonic progress
      for (let i = 1; i < recordedEvents.length; i++) {
        expect(recordedEvents[i].progress).toBeGreaterThanOrEqual(recordedEvents[i - 1].progress);
      }
    });
  });
});
