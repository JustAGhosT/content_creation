import fs from 'fs';
import path from 'path';
import { FeatureFlags, TextParserFeatureFlag } from '../types';

// Initialize feature flags with default values
const featureFlags: FeatureFlags = {
  textParser: {
    enabled: true,
    implementation: 'openai'
  },
  imageGeneration: true,
  summarization: true,
  platformConnectors: true,
  multiPlatformPublishing: true,
  notificationSystem: true,
  feedbackMechanism: true
};

// Path to feature flags JSON file
const featureFlagsPath = path.join(process.cwd(), 'data', 'feature-flags.json');

// Load feature flags from file if it exists
try {
  if (fs.existsSync(featureFlagsPath)) {
    const data = fs.readFileSync(featureFlagsPath, 'utf8');
    Object.assign(featureFlags, JSON.parse(data));
  }
} catch (err) {
  console.error('Error loading feature flags:', err);
}

// Save feature flags to file
export const saveFeatureFlags = (): void => {
  try {
    const dirPath = path.dirname(featureFlagsPath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    fs.writeFileSync(featureFlagsPath, JSON.stringify(featureFlags, null, 2));
  } catch (err) {
    console.error('Error saving feature flags:', err);
    throw err;
  }
};

export default featureFlags;