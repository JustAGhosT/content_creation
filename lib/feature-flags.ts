/**
 * Feature flag types
 */
export interface BaseFeatureFlag {
  enabled: boolean;
}

export interface TextParserFeatureFlag extends BaseFeatureFlag {
  implementation: 'deepseek' | 'openai' | 'azure';
}

export interface FeatureFlags {
  textParser: TextParserFeatureFlag;
  imageGeneration: boolean;
  summarization: boolean;
  platformConnectors: boolean;
  multiPlatformPublishing: boolean;
  notificationSystem: boolean;
  feedbackMechanism: boolean;
  contentFeature: boolean;
  authentication: boolean;
  [key: string]: boolean | BaseFeatureFlag | TextParserFeatureFlag;
}

/**
 * Default feature flag values
 * These can be overridden by environment variables or other configuration
 */
export const featureFlags: FeatureFlags = {
  // Text processing features
  textParser: {
    enabled: true,
    implementation: 'openai'
  },
  summarization: true,
  
  // Content generation features
  imageGeneration: true,
  
  // Platform integration features
  platformConnectors: true,
  multiPlatformPublishing: true,
  
  // User interaction features
  notificationSystem: true,
  feedbackMechanism: true,
  
  // Core features
  contentFeature: true,
  authentication: true
};

/**
 * Updates feature flags based on environment variables
 * This allows for runtime configuration of features
 */
function loadFeatureFlagsFromEnv() {
  // Simple boolean flags
  const booleanFlags = [
    'imageGeneration',
    'summarization',
    'platformConnectors',
    'multiPlatformPublishing',
    'notificationSystem',
    'feedbackMechanism',
    'contentFeature',
    'authentication'
  ];
  
  // Process boolean flags
  for (const flag of booleanFlags) {
    const envValue = process.env[`FEATURE_${flag.toUpperCase()}`];
    if (envValue !== undefined) {
      featureFlags[flag] = envValue.toLowerCase() === 'true';
    }
  }
  
  // Process complex flags
  
  // Text parser
  if (process.env.FEATURE_TEXT_PARSER !== undefined) {
    featureFlags.textParser.enabled = process.env.FEATURE_TEXT_PARSER.toLowerCase() === 'true';
  }
  
  if (process.env.TEXT_PARSER_IMPLEMENTATION) {
    const implementation = process.env.TEXT_PARSER_IMPLEMENTATION.toLowerCase();
    if (['deepseek', 'openai', 'azure'].includes(implementation)) {
      (featureFlags.textParser as TextParserFeatureFlag).implementation = 
        implementation as 'deepseek' | 'openai' | 'azure';
    }
  }
}

/**
 * Checks if a feature is enabled
 * @param featureName The name of the feature to check
 * @returns True if the feature is enabled, false otherwise
 */
export function isFeatureEnabled(featureName: keyof FeatureFlags): boolean {
  const feature = featureFlags[featureName];
  
  if (typeof feature === 'boolean') {
    return feature;
  }
  
  if (typeof feature === 'object' && 'enabled' in feature) {
    return feature.enabled;
  }
  
  return false;
}

// Load feature flags from environment variables on module initialization
loadFeatureFlagsFromEnv();

/**
 * Utility to override feature flags (useful for testing)
 * @param flags Partial feature flags object to merge with existing flags
 */
export function setFeatureFlags(flags: Partial<FeatureFlags>): void {
  Object.assign(featureFlags, flags);
}