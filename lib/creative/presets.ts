/**
 * OmniPost Creative Studio - Brand Kit Presets & Typography Registry
 */

import { BrandKit } from './types';
import { COILTRACE_BRAND_KIT } from './pilot/coiltrace-pilot';

export const TECHNOVA_BRAND_KIT: BrandKit = {
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
  watermarkConfig: {
    enabled: true,
    position: 'bottom-right',
    opacity: 0.75,
    scale: 0.6,
    badgeText: 'Powered by TechNova',
  },
  accessibilityDefaults: {
    enforceHighContrast: true,
    defaultAltTextPrefix: 'TechNova',
  },
  status: 'active',
  createdAt: '2026-08-28T00:00:00.000Z',
  updatedAt: '2026-08-28T00:00:00.000Z',
};

export const VANGUARD_BRAND_KIT: BrandKit = {
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
  watermarkConfig: {
    enabled: true,
    position: 'top-right',
    opacity: 0.85,
    scale: 0.7,
    badgeText: 'Verified by Vanguard',
  },
  accessibilityDefaults: {
    enforceHighContrast: true,
    defaultAltTextPrefix: 'Vanguard',
  },
  status: 'active',
  createdAt: '2026-08-28T00:00:00.000Z',
  updatedAt: '2026-08-28T00:00:00.000Z',
};

export const SOLARPULSE_BRAND_KIT: BrandKit = {
  id: 'brand-solarpulse-v1',
  tenantId: 'tenant-solarpulse',
  name: 'SolarPulse Energy',
  version: 1,
  logoAssetId: 'asset-solarpulse-logo',
  colors: {
    primary: '#ea580c',
    secondary: '#facc15',
    accent: '#16a34a',
    background: '#fffbeb',
    text: '#451a03',
    muted: '#78350f',
  },
  typography: {
    headingFont: 'Outfit',
    bodyFont: 'Inter',
    accentFont: 'Space Mono',
  },
  watermarkConfig: {
    enabled: false,
    position: 'bottom-left',
    opacity: 0.5,
    scale: 0.5,
    badgeText: 'SolarPulse CleanGrid',
  },
  accessibilityDefaults: {
    enforceHighContrast: true,
    defaultAltTextPrefix: 'SolarPulse',
  },
  status: 'active',
  createdAt: '2026-08-28T00:00:00.000Z',
  updatedAt: '2026-08-28T00:00:00.000Z',
};

export const APEXBIO_BRAND_KIT: BrandKit = {
  id: 'brand-apexbio-v1',
  tenantId: 'tenant-apexbio',
  name: 'ApexBio Therapeutics',
  version: 1,
  logoAssetId: 'asset-apexbio-logo',
  colors: {
    primary: '#0284c7',
    secondary: '#14b8a6',
    accent: '#6366f1',
    background: '#f0fdf4',
    text: '#0f172a',
    muted: '#475569',
  },
  typography: {
    headingFont: 'DM Sans',
    bodyFont: 'Inter',
    accentFont: 'JetBrains Mono',
  },
  watermarkConfig: {
    enabled: true,
    position: 'bottom-right',
    opacity: 0.65,
    scale: 0.6,
    badgeText: 'ApexBio Clinical Grade',
  },
  accessibilityDefaults: {
    enforceHighContrast: true,
    defaultAltTextPrefix: 'ApexBio',
  },
  status: 'active',
  createdAt: '2026-08-28T00:00:00.000Z',
  updatedAt: '2026-08-28T00:00:00.000Z',
};

export const CYBERCRAFT_BRAND_KIT: BrandKit = {
  id: 'brand-cybercraft-v1',
  tenantId: 'tenant-cybercraft',
  name: 'CyberCraft Labs',
  version: 1,
  logoAssetId: 'asset-cybercraft-logo',
  colors: {
    primary: '#7c3aed',
    secondary: '#f43f5e',
    accent: '#06b6d4',
    background: '#18181b',
    text: '#fafafa',
    muted: '#a1a1aa',
  },
  typography: {
    headingFont: 'Syne',
    bodyFont: 'Inter',
    accentFont: 'Fira Code',
  },
  watermarkConfig: {
    enabled: true,
    position: 'top-left',
    opacity: 0.9,
    scale: 0.75,
    badgeText: 'CyberCraft Synthetic Proof',
  },
  accessibilityDefaults: {
    enforceHighContrast: true,
    defaultAltTextPrefix: 'CyberCraft',
  },
  status: 'active',
  createdAt: '2026-08-28T00:00:00.000Z',
  updatedAt: '2026-08-28T00:00:00.000Z',
};

export const ALL_BRAND_KIT_PRESETS: BrandKit[] = [
  COILTRACE_BRAND_KIT,
  TECHNOVA_BRAND_KIT,
  VANGUARD_BRAND_KIT,
  SOLARPULSE_BRAND_KIT,
  APEXBIO_BRAND_KIT,
  CYBERCRAFT_BRAND_KIT,
];

export const AVAILABLE_FONTS = {
  headings: [
    'Inter',
    'Plus Jakarta Sans',
    'Space Grotesk',
    'Outfit',
    'DM Sans',
    'Syne',
    'Montserrat',
    'Cabinet Grotesk',
  ],
  bodies: ['Inter', 'Roboto', 'Open Sans', 'Lato', 'DM Sans'],
  accents: ['JetBrains Mono', 'Space Mono', 'Fira Code', 'IBM Plex Mono'],
};
