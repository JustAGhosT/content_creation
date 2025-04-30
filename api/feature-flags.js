import fs from 'fs';
import path from 'path';
import express from 'express';
const router = express.Router();

// Path to store feature flags
const FEATURE_FLAGS_PATH = path.join(__dirname, '../data/feature-flags.json');

// Ensure the data directory exists
const dataDir = path.dirname(FEATURE_FLAGS_PATH);
try {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log(`Created directory: ${dataDir}`);
  }
} catch (error) {
  console.error(`Failed to create directory: ${dataDir}`, error);
}

// Load feature flags from file or use defaults
let featureFlags;
try {
  featureFlags = JSON.parse(fs.readFileSync(FEATURE_FLAGS_PATH, 'utf8'));
  console.log('Feature flags loaded successfully');
} catch (error) {
  // Use default feature flags if file doesn't exist or is invalid
  console.log('Using default feature flags:', error.message);
  featureFlags = {
    textParser: {
      enabled: true,
      implementation: 'deepseek' // Options: 'deepseek', 'openai', 'azure'
    },
    summarization: true,
    imageGeneration: true,
    platformConnectors: true,
    airtableIntegration: true,
    authentication: true,
    notificationSystem: true,
    feedbackMechanism: true,
    auditTrail: true,
    mobileResponsiveness: true,
  };
}

// Function to save feature flags to file
const saveFeatureFlags = () => {
  try {
    fs.writeFileSync(FEATURE_FLAGS_PATH, JSON.stringify(featureFlags, null, 2));
  } catch (error) {
    console.error('Failed to save feature flags:', error);
  }
};

// Get all feature flags
router.get('/feature-flags', authenticateRequest, (_req, res) => {
  res.json(featureFlags);
});

// Update a feature flag
router.patch('/feature-flags/:feature', authenticateRequest, (req, res) => {
  const { feature } = req.params;
  const { enabled, implementation } = req.body;

  if (!feature) {
    return res.status(400).json({ message: 'Feature name is required' });
  }

  if (typeof enabled === 'undefined') {
    return res.status(400).json({ message: 'Enabled status is required' });
  }

  if (typeof enabled !== 'boolean') {
    return res.status(400).json({ message: 'Enabled status must be a boolean' });
  }

  // …rest of the handler…
});

  if (Object.hasOwn(featureFlags, feature)) {
    if (typeof featureFlags[feature] === 'object') {
      featureFlags[feature].enabled = enabled;
      if (implementation) {
        // Validate implementation values for textParser
        if (
          feature === 'textParser' &&
          !['deepseek', 'openai', 'azure'].includes(implementation)
        ) {
          return res.status(400).json({ message: 'Invalid implementation value' });
        }
        featureFlags[feature].implementation = implementation;
      }
    } else {
      featureFlags[feature] = enabled;
    }

    // Persist changes
    saveFeatureFlags();
    return res.status(200).json({ message: 'Feature flag updated successfully' });
  }

  return res.status(400).json({ message: 'Invalid feature flag' });
});

export default router;
