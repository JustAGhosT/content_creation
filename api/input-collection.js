const express = require('express');
const router = express.Router();
const axios = require('axios');
const featureFlags = require('./feature-flags');

// RSS Feed Integration
const fetchRSSFeed = async () => {
  try {
    const response = await axios.get('https://example.com/rss-feed');
    return response.data;
  } catch (error) {
    throw new Error('Failed to fetch RSS feed');
  }
};

// HTTP Endpoint for manual content submission
router.post('/submit-content', async (req, res) => {
  const { content } = req.body;

  try {
    // Simulate storing the submitted content
    console.log('Content submitted:', content);
    res.status(200).json({ message: 'Content submitted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit content' });
  }
});

// Endpoint to fetch content based on feature flag
router.get('/fetch-content', async (req, res) => {
  try {
    let content;
    if (featureFlags.inputCollection === 'rss') {
      content = await fetchRSSFeed();
    } else if (featureFlags.inputCollection === 'http') {
      content = 'Manual content submission is enabled';
    } else {
      return res.status(400).json({ error: 'Invalid input collection feature flag' });
    }
    res.json({ content });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch content' });
  }
});

module.exports = router;
