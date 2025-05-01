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
  { id: 1, name: 'Facebook', slug: 'facebook', description: 'Facebook social media platform' },
  { id: 2, name: 'Instagram', slug: 'instagram', description: 'Instagram photo sharing platform' },
  { id: 3, name: 'LinkedIn', slug: 'linkedin', description: 'LinkedIn professional network' },
  { id: 4, name: 'Twitter', slug: 'twitter', description: 'Twitter microblogging platform' },
  { id: 5, name: 'Custom Channel', slug: 'custom-channel', description: 'Custom publishing channel' }
];

/**
 * Platform configurations with API endpoints and authentication details
 */
export const platformConfigurations: Record<string, PlatformConfig> = {
  facebook: {
    apiUrl: 'https://api.facebook.com/publish',
    apiKey: process.env.FACEBOOK_API_KEY || (console.warn('FACEBOOK_API_KEY not set'), ''),
    required: true,
    capabilities: ['text', 'image', 'video']
  },
  instagram: {
    apiUrl: 'https://api.instagram.com/publish',
    apiKey: process.env.INSTAGRAM_API_KEY || (console.warn('INSTAGRAM_API_KEY not set'), ''),
    required: true,
    capabilities: ['image', 'video']
  },
  linkedin: {
    apiUrl: 'https://api.linkedin.com/publish',
    apiKey: process.env.LINKEDIN_API_KEY || (console.warn('LINKEDIN_API_KEY not set'), ''),
    required: true,
    capabilities: ['text', 'image', 'article']
  },
  twitter: {
    apiUrl: 'https://api.twitter.com/publish',
    apiKey: process.env.TWITTER_API_KEY || (console.warn('TWITTER_API_KEY not set'), ''),
    required: true,
    capabilities: ['text', 'image', 'video']
  },
  'custom-channel': {
    apiUrl: 'https://api.customchannel.com/publish',
    apiKey: process.env.CUSTOM_CHANNEL_API_KEY || (console.warn('CUSTOM_CHANNEL_API_KEY not set'), ''),
    required: true,
    headers: { 
      'Authorization': `Bearer ${process.env.CUSTOM_CHANNEL_API_KEY || ''}`,
      'Content-Type': 'application/json'
    },
    capabilities: ['text', 'image', 'video', 'audio']
  }
};

/**
 * Validate that all required API keys are provided
 */
export function validateApiKeys(): void {
  const missingKeys = Object.entries(platformConfigurations)
    .filter(([_, config]) => config.required && !config.apiKey)
    .map(([name]) => name);
    
  if (missingKeys.length > 0) {
    console.warn(`Missing API keys for required platforms: ${missingKeys.join(', ')}`);
    console.warn('API calls to these platforms will likely fail');
  }
}

/**
 * Get platform configuration by name (case-insensitive)
 */
export function getPlatformConfig(platformName: string): PlatformConfig | undefined {
  // Normalize the platform name to match our keys
  const normalizedName = platformName.toLowerCase().replace(/\s+/g, '-');
  return platformConfigurations[normalizedName] || 
         platformConfigurations[platformName.toLowerCase()];
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
    platform => platform.slug.toLowerCase() === normalizedSlug || 
                platform.name.toLowerCase() === normalizedSlug
  );
}

// Validate API keys during module initialization
validateApiKeys();