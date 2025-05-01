import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { authenticateRequest } from './authenticationHelpers';

const router = Router();

// Define interfaces for feature flags
interface BaseFeatureFlag {
  enabled: boolean;
}

interface TextParserFeatureFlag extends BaseFeatureFlag {
  implementation: 'deepseek' | 'openai' | 'azure';
}

interface FeatureFlags {
  textParser: TextParserFeatureFlag;
  imageGeneration: boolean;
  summarization: boolean;
  platformConnectors: boolean;
  multiPlatformPublishing: boolean;
  notificationSystem: boolean;
  feedbackMechanism: boolean;
  [key: string]: boolean | BaseFeatureFlag | TextParserFeatureFlag;
}

// Define interface for feature flag update request
interface FeatureFlagUpdateRequest {
  feature: string;
  enabled: boolean;
  implementation?: string;
}

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
const saveFeatureFlags = (): void => {
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

// Route to update feature flags
router.post('/feature-flags', authenticateRequest, (req: Request, res: Response) => {
  const { feature, enabled, implementation } = req.body as FeatureFlagUpdateRequest;

  // Validate input
  if (!feature || typeof feature !== 'string') {
    return res.status(400).json({ message: 'Feature name must be a non-empty string' });
  }

  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ message: 'Enabled must be a boolean value' });
  }

  // Only allow known properties
  const allowedProps = ['feature', 'enabled', 'implementation'];
  const invalidProps = Object.keys(req.body).filter(prop => !allowedProps.includes(prop));
  if (invalidProps.length > 0) {
    return res.status(400).json({ message: `Invalid properties in request body: ${invalidProps.join(', ')}` });
  }

  if (Object.prototype.hasOwnProperty.call(featureFlags, feature)) {
    if (typeof featureFlags[feature] === 'object') {
      (featureFlags[feature] as BaseFeatureFlag).enabled = enabled;
      if (typeof implementation !== 'undefined') {
        // Validate implementation values for textParser
        if (
          feature === 'textParser' &&
          !['deepseek', 'openai', 'azure'].includes(implementation)
        ) {
          return res.status(400).json({ message: 'Invalid implementation value' });
        }
        (featureFlags[feature] as TextParserFeatureFlag).implementation = implementation as 'deepseek' | 'openai' | 'azure';
      }
    } else {
      featureFlags[feature] = enabled;
    }
    try {
      saveFeatureFlags();
      return res.status(200).json({ message: 'Feature flag updated successfully' });
    } catch (err) {
      return res.status(500).json({ message: 'Failed to persist feature flags' });
    }
  } else {
    return res.status(400).json({ message: 'Invalid feature flag' });
  }
});

// Route to get all feature flags
router.get('/feature-flags', authenticateRequest, (_req: Request, res: Response) => {
  res.json(featureFlags);
});

// Route to get a specific feature flag
router.get('/feature-flags/:feature', authenticateRequest, (req: Request, res: Response) => {
  const { feature } = req.params;
  
  if (Object.prototype.hasOwnProperty.call(featureFlags, feature)) {
    res.json({ [feature]: featureFlags[feature] });
  } else {
    res.status(404).json({ message: 'Feature flag not found' });
  }
});

// Export individual feature flags for direct import in other modules
export const { 
  textParser, 
  imageGeneration, 
  summarization, 
  platformConnectors, 
  multiPlatformPublishing, 
  notificationSystem, 
  feedbackMechanism 
} = featureFlags;

export default router;