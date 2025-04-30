const express = require('express');
const router = express.Router();
const featureFlags = require('./feature-flags');

// Middleware to select the correct tool based on feature flags
const selectTool = (req, res, next) => {
  const { feature } = req.body;

  if (!featureFlags[feature]) {
    return res.status(400).json({ message: 'Feature not enabled' });
  }

  switch (feature) {
    case 'textParser':
      req.tool = require('./text-parser');
      break;
    case 'summarization':
      req.tool = require('./summarization');
      break;
    case 'imageGeneration':
      req.tool = require('./image-generation');
      break;
    case 'platformConnectors':
      req.tool = require('./platform-connectors');
      break;
    case 'airtableIntegration':
      req.tool = require('./airtable-integration');
      break;
    case 'authentication':
      req.tool = require('./authentication');
      break;
    case 'notificationSystem':
      req.tool = require('./notification-system');
      break;
    case 'feedbackMechanism':
      req.tool = require('./feedback-mechanism');
      break;
    case 'auditTrail':
      req.tool = require('./audit-trail');
      break;
    case 'mobileResponsiveness':
      req.tool = require('./mobile-responsiveness');
      break;
    default:
      return res.status(400).json({ message: 'Invalid feature' });
  }

  next();
};

// Endpoint to handle tool selection
router.post('/select-tool', selectTool, (req, res) => {
  res.status(200).json({ message: 'Tool selected successfully', tool: req.tool });
});

module.exports = router;
