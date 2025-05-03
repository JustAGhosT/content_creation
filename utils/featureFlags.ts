/**
 * Feature flags configuration
 * This file manages feature flags for the application
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
// Define specific feature flag types
export interface TextParserFeatureFlag {
  enabled: boolean;
  implementation: 'deepseek' | 'openai' | 'azure';
}

export interface FeatureFlag {
  enabled: boolean;
  implementation?: string;
}

// Define the base feature flags interface without index signature
interface BaseFeatureFlags {
  textParser: TextParserFeatureFlag;
  imageGeneration: boolean;
  summarization: boolean;
  platformConnectors: boolean;
  multiPlatformPublishing: boolean;
  notificationSystem: boolean;
  feedbackMechanism: boolean;
  airtableIntegration: boolean;
}

// Extend the base interface with an index signature for dynamic access
export interface FeatureFlags extends BaseFeatureFlags {
  [key: string]: boolean | TextParserFeatureFlag | any;
}
// Simple mutex implementation for synchronizing feature flag updates
class Mutex {
  private locked = false;
  private waitQueue: Array<() => void> = [];

  async acquire(): Promise<void> {
    return new Promise<void>(resolve => {
      if (!this.locked) {
        this.locked = true;
        resolve();
      } else {
        this.waitQueue.push(resolve);
      }
    });
  }

  release(): void {
    if (this.waitQueue.length > 0) {
      const next = this.waitQueue.shift();
      if (next) next();
    } else {
      this.locked = false;
    }
  }
}

// Create a mutex for feature flag updates
const mutex = new Mutex();

// Path for persisting feature flags (if in Node.js environment)
const featureFlagsPath = typeof process !== 'undefined' && process.cwd
  ? path.join(process.cwd(), 'data', 'feature-flags.json')
  : '';

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
 * Save feature flags to localStorage (in browser) or file (in Node.js)
 * Uses atomic file operations and mutex to prevent race conditions
 */
export async function saveFeatureFlags(): Promise<void> {
  // Acquire the mutex to prevent concurrent updates
  await mutex.acquire();
  try {
    if (typeof window !== 'undefined') {
      // Browser environment
      localStorage.setItem('featureFlags', JSON.stringify(featureFlags));
    } else if (featureFlagsPath) {
      // Node.js environment - use atomic file operations
      const dirPath = path.dirname(featureFlagsPath);
      
      // Ensure directory exists
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      
      // Create a temporary file with a unique name
      const tmpPath = path.join(
        os.tmpdir(),
        `feature-flags-${Date.now()}-${Math.random().toString(36).substring(2)}.json`
      );
      
      // Write to temporary file first
      fs.writeFileSync(tmpPath, JSON.stringify(featureFlags, null, 2), 'utf8');
      
      // Atomically rename the temporary file to the target file
      // This ensures the write is atomic and prevents partial writes
      fs.renameSync(tmpPath, featureFlagsPath);
    }
  } finally {
    // Always release the mutex
    mutex.release();
  }
}

/**
 * Load feature flags from localStorage (in browser) or file (in Node.js)
 * @returns Current feature flags
 */
export function loadFeatureFlags(): FeatureFlags {
  if (typeof window !== 'undefined') {
    // Browser environment
    const stored = localStorage.getItem('featureFlags');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse stored feature flags:', e);
      }
    }
  } else if (featureFlagsPath && fs.existsSync(featureFlagsPath)) {
    // Node.js environment
    try {
      const data = fs.readFileSync(featureFlagsPath, 'utf8');
      return { ...featureFlags, ...JSON.parse(data) };
    } catch (e) {
      console.error('Failed to load feature flags from file:', e);
    }
  }
  return featureFlags;
}

// Initialize by loading saved flags
try {
  const savedFlags = loadFeatureFlags();
  Object.assign(featureFlags, savedFlags);
} catch (e) {
  console.error('Error loading feature flags:', e);
}
// Export the default feature flags
export default featureFlags;
