/**
 * Built-in Creative Templates for OmniPost
 * Derived cleanly from validated design concepts in FlairForge.
 */

import { sha256 } from '@/lib/campaigns/contracts';
import type { CreativeTemplate, CreativeTemplateVersion } from '../types';

function computeTemplateVersionHash(
  version: Omit<CreativeTemplateVersion, 'canonicalHash'>
): string {
  return sha256({
    templateId: version.templateId,
    version: version.version,
    canvas: version.canvas,
    slots: version.slots,
    accessibilityRules: version.accessibilityRules,
    lifecycleState: version.lifecycleState,
  });
}

// 1. Modern Social Flyer (Instagram / LinkedIn 1:1 post)
const flyerV1Base: Omit<CreativeTemplateVersion, 'canonicalHash'> = {
  id: 'template-ver-flyer-modern-v1',
  templateId: 'tmpl-social-flyer',
  version: 1,
  canvas: {
    width: 1080,
    height: 1080,
    unit: 'px',
    dpi: 72,
    aspectRatio: '1:1',
    safeArea: { top: 40, bottom: 40, left: 40, right: 40 },
  },
  slots: [
    {
      id: 'slot-logo',
      name: 'Organization Logo',
      type: 'logo',
      bounds: { x: 60, y: 60, width: 160, height: 60, zIndex: 10 },
      required: true,
      ariaLabel: 'Brand Logo',
    },
    {
      id: 'slot-headline',
      name: 'Main Headline',
      type: 'text',
      bounds: { x: 60, y: 160, width: 960, height: 180, zIndex: 10 },
      constraints: { maxLength: 120, maxLines: 3, maxFontSize: 72, minFontSize: 36 },
      defaultValue: 'Announcing Our Next Innovation',
      required: true,
      styleTokens: {
        fontFamilyToken: 'heading',
        fontWeight: 'bold',
        colorToken: 'primary',
        textAlign: 'left',
      },
      ariaLabel: 'Main Headline',
    },
    {
      id: 'slot-body',
      name: 'Event / Product Details',
      type: 'text',
      bounds: { x: 60, y: 360, width: 960, height: 220, zIndex: 10 },
      constraints: { maxLength: 300, maxLines: 6, maxFontSize: 32, minFontSize: 18 },
      defaultValue: 'Join us live as we showcase the newest capabilities and partner integrations.',
      required: true,
      styleTokens: {
        fontFamilyToken: 'body',
        colorToken: 'text',
        textAlign: 'left',
      },
      ariaLabel: 'Flyer Body Content',
    },
    {
      id: 'slot-hero-image',
      name: 'Hero Graphic / Visual',
      type: 'image',
      bounds: { x: 60, y: 600, width: 960, height: 360, zIndex: 5 },
      constraints: { acceptedMediaTypes: ['image/png', 'image/jpeg', 'image/webp'] },
      required: false,
      ariaLabel: 'Hero Background Visual',
    },
    {
      id: 'slot-cta',
      name: 'Call to Action',
      type: 'cta',
      bounds: { x: 60, y: 980, width: 320, height: 60, zIndex: 10 },
      constraints: { maxLength: 40 },
      defaultValue: 'Register Now',
      required: true,
      styleTokens: {
        fontFamilyToken: 'body',
        fontWeight: 'bold',
        backgroundColorToken: 'secondary',
        colorToken: 'background',
        borderRadiusToken: 'md',
        textAlign: 'center',
      },
      ariaLabel: 'Action Button',
    },
    {
      id: 'slot-contact',
      name: 'Website / Handle',
      type: 'contact',
      bounds: { x: 420, y: 990, width: 600, height: 40, zIndex: 10 },
      constraints: { maxLength: 100 },
      defaultValue: 'omnipost.app',
      required: false,
      styleTokens: {
        fontFamilyToken: 'body',
        colorToken: 'muted',
        textAlign: 'right',
      },
      ariaLabel: 'Contact URL',
    },
  ],
  accessibilityRules: {
    readingOrder: [
      'slot-logo',
      'slot-headline',
      'slot-body',
      'slot-hero-image',
      'slot-cta',
      'slot-contact',
    ],
    requiredAltTextSlots: ['slot-logo', 'slot-hero-image'],
    minColorContrastRatio: 4.5,
  },
  lifecycleState: 'published',
  createdAt: '2026-08-28T00:00:00.000Z',
  createdBy: 'system',
};

export const BUILTIN_FLYER_TEMPLATE_V1: CreativeTemplateVersion = {
  ...flyerV1Base,
  canonicalHash: computeTemplateVersionHash(flyerV1Base),
};

export const BUILTIN_TEMPLATES: CreativeTemplate[] = [
  {
    id: 'tmpl-social-flyer',
    name: 'Standard Social Flyer',
    description:
      'Clean high-impact 1:1 format flyer suitable for LinkedIn, Instagram, and Twitter announcements.',
    category: 'flyer',
    supportedPlatforms: ['instagram', 'linkedin', 'twitter', 'facebook'],
    currentVersion: 1,
    versions: [BUILTIN_FLYER_TEMPLATE_V1],
    createdAt: '2026-08-28T00:00:00.000Z',
    updatedAt: '2026-08-28T00:00:00.000Z',
  },
];
