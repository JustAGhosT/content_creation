const express = require('express');
const router = express.Router();

const fs = require('fs');
const path = require('path');
const express = require('express');
const router = express.Router();

// Path to store feature flags
const FEATURE_FLAGS_PATH = path.join(__dirname, '../data/feature-flags.json');

// Load feature flags from file or use defaults
let featureFlags;
try {
  featureFlags = JSON.parse(fs.readFileSync(FEATURE_FLAGS_PATH, 'utf8'));
} catch (error) {
  // Use default feature flags if file doesn't exist or is invalid
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

router.get('/feature-flags', (req, res) => {
  res.json(featureFlags);
});

router.post('/feature-flags', (req, res) => {
  const { feature, enabled, implementation } = req.body;
  if (featureFlags.hasOwnProperty(feature)) {
    if (typeof featureFlags[feature] === 'object') {
      featureFlags[feature].enabled = enabled;
      if (implementation) {
        featureFlags[feature].implementation = implementation;
      }
    } else {
      featureFlags[feature] = enabled;
    }
    // Persist changes
    saveFeatureFlags();
    res.status(200).json({ message: 'Feature flag updated successfully' });
  } else {
    res.status(400).json({ message: 'Invalid feature flag' });
  }
});

module.exports = router;
