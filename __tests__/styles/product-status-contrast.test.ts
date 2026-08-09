import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from '@jest/globals';

const css = readFileSync(join(process.cwd(), 'styles', 'ProductStatus.module.css'), 'utf8');

const hexToRgb = (hex: string) => {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
};

const relativeLuminance = (hex: string) => {
  const channels = hexToRgb(hex).map(channel => {
    const normalized = channel / 255;
    return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
  });

  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
};

const contrastRatio = (foreground: string, background: string) => {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
};

describe('ProductStatus contrast', () => {
  test.each([
    ['sign-in pill', '--product-status-pill-foreground', '#3a5481', '#ffffff'],
    ['dark header pill', '--product-status-pill-foreground', '#dbeafe', '#243040'],
    ['dark-theme footer description', '--product-status-footer-description', '#1e293b', '#94a3b8'],
  ])('%s meets WCAG AA for normal text', (_surface, property, foreground, background) => {
    expect(css).toContain(`${property}: ${foreground}`);
    expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });
});
