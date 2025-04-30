const express = require('express');
const router = express.Router();
const featureFlags = require('./feature-flags');

// Pre-load modules at startup
const toolModules = {
  textParser: require('./text-parser'),
  summarization: require('./summarization'),
  imageGeneration: require('./image-generation'),
  platformConnectors: require('./platform-connectors'),
  airtableIntegration: require('./airtable-integration'),
  authentication: require('./authentication'),
  notificationSystem: require('./notification-system'),
  feedbackMechanism: require('./feedback-mechanism'),
  auditTrail: require('./audit-trail'),
  mobileResponsiveness: require('./mobile-responsiveness')
};

// Middleware to select the correct tool based on feature flags
const selectTool = (req, res, next) => {
  const { feature } = req.body;

  // Check if feature exists and is enabled
  if (
    !featureFlags[feature] ||
    (typeof featureFlags[feature] === 'object' && !featureFlags[feature].enabled)
  ) {
    return res.status(400).json({ message: 'Feature not enabled' });
  }

  // Get the pre-loaded module
  const tool = toolModules[feature];
  if (!tool) {
    return res.status(400).json({ message: 'Invalid feature' });
  }

  req.tool = tool;
  next();
};

// Endpoint to handle tool selection
router.post('/select-tool', selectTool, (req, res) => {
  res.status(200).json({ message: 'Tool selected successfully', feature: req.body.feature });
});

module.exports = router;
