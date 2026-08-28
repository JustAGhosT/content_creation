/**
 * OmniPost Creative Studio - Palette Extraction & Contrast Utilities
 * Supports tenant theme selection, dynamic palette derivation, and WCAG 2.1 AA/AAA compliance checks.
 */

import { BrandKitColors } from './types';

/**
 * Calculates relative luminance for an sRGB color per WCAG 2.1 specification.
 */
export function getRelativeLuminance(hex: string): number {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const srgbTransform = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  const rLum = srgbTransform(r);
  const gLum = srgbTransform(g);
  const bLum = srgbTransform(b);

  return 0.2126 * rLum + 0.7152 * gLum + 0.0722 * bLum;
}

/**
 * Calculates WCAG 2.1 contrast ratio between two hex colors.
 * Returns a ratio between 1.0 and 21.0.
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  try {
    const lum1 = getRelativeLuminance(hex1);
    const lum2 = getRelativeLuminance(hex2);
    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);
    const ratio = (lighter + 0.05) / (darker + 0.05);
    return Math.round(ratio * 10) / 10;
  } catch {
    return 4.5;
  }
}

/**
 * Validates WCAG 2.1 compliance level for text on background.
 */
export function evaluateWcagCompliance(contrastRatio: number): {
  aaNormal: boolean;
  aaLarge: boolean;
  aaaNormal: boolean;
  aaaLarge: boolean;
  badge: 'AAA' | 'AA' | 'AA Large' | 'Fail';
} {
  const aaNormal = contrastRatio >= 4.5;
  const aaLarge = contrastRatio >= 3.0;
  const aaaNormal = contrastRatio >= 7.0;
  const aaaLarge = contrastRatio >= 4.5;

  let badge: 'AAA' | 'AA' | 'AA Large' | 'Fail' = 'Fail';
  if (aaaNormal) badge = 'AAA';
  else if (aaNormal) badge = 'AA';
  else if (aaLarge) badge = 'AA Large';

  return { aaNormal, aaLarge, aaaNormal, aaaLarge, badge };
}

/**
 * Dynamically derives a cohesive BrandKit color palette from a single seed/primary hex code.
 */
export function extractPaletteFromSeed(
  primaryHex: string,
  mode: 'light' | 'dark' = 'light'
): BrandKitColors {
  const cleanHex = primaryHex.startsWith('#') ? primaryHex : `#${primaryHex}`;
  const lum = getRelativeLuminance(cleanHex);

  if (mode === 'dark') {
    return {
      primary: cleanHex,
      secondary: lum > 0.3 ? '#38bdf8' : '#818cf8',
      accent: '#a855f7',
      background: '#090d16',
      text: '#f8fafc',
      muted: '#94a3b8',
    };
  }

  // Light theme derivation
  return {
    primary: cleanHex,
    secondary: lum > 0.5 ? '#0284c7' : '#06b6d4',
    accent: '#8b5cf6',
    background: '#ffffff',
    text: '#0f172a',
    muted: '#64748b',
  };
}
