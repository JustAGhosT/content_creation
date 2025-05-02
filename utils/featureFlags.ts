/**
 * Feature flags configuration
 * This file manages feature flags for the application
 */

// Define feature flag types
export interface FeatureFlag {
  enabled: boolean;
  implementation?: string;
}

export interface FeatureFlags {
  textParser: {
    enabled: boolean;
    implementation: 'deepseek' | 'openai' | 'azure';
  };
  imageGeneration: boolean;
  summarization: boolean;
  platformConnectors: boolean;
  multiPlatformPublishing: boolean;
  notificationSystem: boolean;
  feedbackMechanism: boolean;
  airtableIntegration: boolean;
}

// Default feature flags configuration
const featureFlags: FeatureFlags = {
  textParser: {
    enabled: true,
    implementation: 'openai',
  },
  imageGeneration: true,
  summarization: true,
  platformConnectors: true,
  multiPlatformPublishing: true,
  notificationSystem: true,
  feedbackMechanism: true,
  airtableIntegration: true,
};

/**
 * Save feature flags to localStorage (in browser) or memory (in Node.js)
 * @param flags Updated feature flags
 */
export function saveFeatureFlags(flags: FeatureFlags): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('featureFlags', JSON.stringify(flags));
  } else {
    // In Node.js environment, just update the module variable
    Object.assign(featureFlags, flags);
  }
}

/**
 * Load feature flags from localStorage (in browser) or return default (in Node.js)
 * @returns Current feature flags
 */
export function loadFeatureFlags(): FeatureFlags {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('featureFlags');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse stored feature flags:', e);
      }
    }
  }
  return featureFlags;
}

// Export the default feature flags
export default featureFlags;