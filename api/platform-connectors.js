const express = require('express');
const router = express.Router();
const axios = require('axios');

// Mock data for platforms
const platforms = [
  { id: 1, name: 'Facebook' },
  { id: 2, name: 'Instagram' },
  { id: 3, name: 'LinkedIn' },
  { id: 4, name: 'Twitter' },
  { id: 5, name: 'Custom Channel' }
];

// Platform-specific configurations (mocked for demonstration)
const platformConfigurations = {
  facebook: {
    apiUrl: 'https://api.facebook.com/publish',
    apiKey: process.env.FACEBOOK_API_KEY,
  },
  'custom channel': {
    apiUrl: 'https://api.customchannel.com/publish',
    apiKey: process.env.CUSTOM_CHANNEL_API_KEY,
    headers: { 'Authorization': `Bearer ${process.env.CUSTOM_CHANNEL_API_KEY}` }
  }
};
// Endpoint to approve pre-publishing queue
router.post('/approve-queue', async (req, res) => {
  const { queue } = req.body;

  // Validate queue structure
  if (!Array.isArray(queue) || !queue.length) {
    return res.status(400).json({ message: 'Queue must be a non-empty array' });
  }

  const results = { success: [], failed: [] };

  try {
    // Simulate publishing to each platform
    for (const item of queue) {
      // Validate item structure
      if (!item.platform || !item.platform.name || !item.content) {
        results.failed.push({ item, error: 'Invalid item structure' });
        continue;
      }

      // Get platform-specific configuration instead of constructing URL
      const platformConfig = platformConfigurations[item.platform.name.toLowerCase()];
      if (!platformConfig) {
        results.failed.push({ item, error: 'Platform configuration not found' });
        continue;
      }

      try {
        await axios.post(platformConfig.apiUrl, {
          content: item.content
        }, {
          headers: {
            ...platformConfig.headers,
            'Authorization': `Bearer ${platformConfig.apiKey}`
          }
        });
        results.success.push(item);
      } catch (err) {
        results.failed.push({ item, error: err.message });
      }
    }

    // Return appropriate response based on results
    if (results.failed.length === 0) {
      res.status(200).json({ message: 'Queue approved and published successfully', results });
    } else if (results.success.length === 0) {
      res.status(500).json({ message: 'All publishing attempts failed', results });
    } else {
      res.status(207).json({ message: 'Some items published successfully', results });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error publishing queue', error: error.message });
  }
});

// Endpoint to get available platforms
router.get('/platforms', (req, res) => {
  res.json(platforms);
});



module.exports = router;
