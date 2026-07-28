/**
 * Platform configuration module
 * Centralizes all platform-specific configurations and API keys
 */

// Define interfaces for platform configuration
export interface Platform {
  id: number;
  name: string;
  slug: string;
  description?: string;
  defaultContentFlow?: boolean;
  requiresMedia?: boolean;
  comingSoon?: boolean;
}

export interface PlatformConfig {
  apiUrl: string;
  apiKey: string;
  headers?: Record<string, string>;
  required?: boolean; // Flag to indicate if this platform requires an API key
  capabilities?: string[]; // Features supported by this platform
}

// List of available platforms
export const platforms: Platform[] = [
  {
    id: 1,
    name: 'Facebook',
    slug: 'facebook',
    description: 'Facebook social media platform',
    comingSoon: true,
  },
  {
    id: 2,
    name: 'Instagram',
    slug: 'instagram',
    description: 'Instagram photo sharing platform',
    comingSoon: true,
  },
  {
    id: 3,
    name: 'LinkedIn',
    slug: 'linkedin',
    description: 'LinkedIn professional network',
    comingSoon: true,
  },
  { id: 4, name: 'X', slug: 'twitter', description: 'X social network' },
  {
    id: 5,
    name: 'TikTok',
    slug: 'tiktok',
    description: 'TikTok short-form video platform',
    defaultContentFlow: false,
    requiresMedia: true,
    comingSoon: true,
  },
  {
    id: 6,
    name: 'Pinterest Sandbox',
    slug: 'pinterest',
    description: 'Pinterest provider-operated sandbox',
    defaultContentFlow: false,
    requiresMedia: true,
    comingSoon: true,
  },
  {
    id: 7,
    name: 'Custom Channel',
    slug: 'custom-channel',
    description: 'Custom publishing channel',
    comingSoon: true,
  },
];

/**
 * Platform configurations with API endpoints and authentication details
 */
export const platformConfigurations: Record<string, PlatformConfig> = {
  facebook: {
    apiUrl: process.env.FACEBOOK_API_URL || 'https://graph.facebook.com/v23.0/me/feed',
    apiKey: process.env.FACEBOOK_API_KEY || '',
    required: true,
    capabilities: ['text', 'image', 'video'],
  },
  instagram: {
    apiUrl: process.env.INSTAGRAM_API_URL || 'https://graph.instagram.com/v23.0/me/media',
    apiKey: process.env.INSTAGRAM_API_KEY || '',
    required: true,
    capabilities: ['image', 'video'],
  },
  linkedin: {
    apiUrl: 'https://api.linkedin.com/publish',
    apiKey: process.env.LINKEDIN_API_KEY || '',
    required: true,
    capabilities: ['text', 'image', 'article'],
  },
  twitter: {
    apiUrl: process.env.TWITTER_API_URL || 'https://api.x.com/2/tweets',
    apiKey: '',
    required: false,
    capabilities: ['text', 'image', 'video'],
  },
  tiktok: {
    apiUrl: process.env.TIKTOK_API_URL || 'https://open.tiktokapis.com/v2/post/publish/video/init/',
    apiKey: process.env.TIKTOK_API_KEY || '',
    required: true,
    capabilities: ['video'],
  },
  pinterest: {
    apiUrl: 'https://api-sandbox.pinterest.com/v5/pins',
    apiKey: '',
    required: false,
    capabilities: ['image'],
  },
  'custom-channel': {
    apiUrl: 'https://api.customchannel.com/publish',
    apiKey: process.env.CUSTOM_CHANNEL_API_KEY || '',
    required: true,
    headers: {
      Authorization: `Bearer ${process.env.CUSTOM_CHANNEL_API_KEY || ''}`,
      'Content-Type': 'application/json',
    },
    capabilities: ['text', 'image', 'video', 'audio'],
  },
};

/**
 * Validate that all required API keys are provided
 * @param silent - If true, suppress console warnings (useful for tests)
 */
export function validateApiKeys(silent = false): string[] {
  const missingKeys = Object.entries(platformConfigurations)
    .filter(([_, config]) => config.required && !config.apiKey)
    .map(([name]) => name);

  if (!silent && missingKeys.length > 0) {
    console.warn(`Missing API keys for required platforms: ${missingKeys.join(', ')}`);
    console.warn('API calls to these platforms will likely fail');
  }

  return missingKeys;
}

/**
 * Get platform configuration by name (case-insensitive)
 */
export function getPlatformConfig(platformName: string): PlatformConfig | undefined {
  // Normalize the platform name to match our keys
  const normalizedName = platformName.toLowerCase().replaceAll(/\s+/g, '-');
  return (
    platformConfigurations[normalizedName] || platformConfigurations[platformName.toLowerCase()]
  );
}

/**
 * Get platform by ID
 */
export function getPlatformById(id: number): Platform | undefined {
  return platforms.find(platform => platform.id === id);
}

/**
 * Get platform by slug or name
 */
export function getPlatformBySlug(slug: string): Platform | undefined {
  const normalizedSlug = slug.toLowerCase();
  return platforms.find(
    platform =>
      platform.slug.toLowerCase() === normalizedSlug ||
      platform.name.toLowerCase() === normalizedSlug
  );
}

// Only validate API keys in non-test environments
// In tests, API keys are typically mocked or not needed
if (process.env.NODE_ENV !== 'test') {
  validateApiKeys();
}
