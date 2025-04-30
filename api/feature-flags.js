const express = require('express');
const router = express.Router();

const featureFlags = {
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
    res.status(200).json({ message: 'Feature flag updated successfully' });
  } else {
    res.status(400).json({ message: 'Invalid feature flag' });
  }
});

module.exports = router;
