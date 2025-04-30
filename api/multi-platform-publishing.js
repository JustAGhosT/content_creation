const express = require('express');
const router = express.Router();
const axios = require('axios');
const featureFlags = require('./feature-flags');

// Endpoint to publish content to multiple platforms
router.post('/publish-content', async (req, res) => {
  const { content, platforms } = req.body;

  try {
    for (const platform of platforms) {
      if (featureFlags.platformConnectors[platform]) {
        await axios.post(`https://api.${platform}.com/publish`, { content });
      } else {
        return res.status(400).json({ error: `Platform ${platform} is not enabled` });
      }
    }
    res.status(200).json({ message: 'Content published successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to publish content' });
  }
});

// Endpoint to add content to pre-publishing queue
router.post('/add-to-queue', async (req, res) => {
  const { content, platforms } = req.body;

  try {
    // Simulate adding content to pre-publishing queue
    console.log('Content added to queue:', { content, platforms });
    res.status(200).json({ message: 'Content added to queue successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add content to queue' });
  }
});

// Endpoint to approve content in pre-publishing queue
router.post('/approve-queue', async (req, res) => {
  const { queue } = req.body;

  try {
    for (const item of queue) {
      if (featureFlags.platformConnectors[item.platform]) {
        await axios.post(`https://api.${item.platform}.com/publish`, { content: item.content });
      } else {
        return res.status(400).json({ error: `Platform ${item.platform} is not enabled` });
      }
    }
    res.status(200).json({ message: 'Queue approved and content published successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to approve queue' });
  }
});

module.exports = router;
