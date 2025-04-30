const express = require('express');
const router = express.Router();
const axios = require('axios');
const featureFlags = require('./feature-flags');

// RSS Feed Integration
const fetchRSSFeed = async () => {
  try {
    const rssFeedUrl = process.env.RSS_FEED_URL || 'https://example.com/rss-feed';
    const response = await axios.get(rssFeedUrl);
    return response.data;
  } catch (error) {
    // handle error appropriately
    throw error;
  }
};

// HTTP Endpoint for manual content submission
router.post('/submit-content', async (req, res) => {
  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }

  try {
    // Simulate storing the submitted content
    console.log('Content submitted:', content);
    // TODO: Implement actual content storage
    res.status(200).json({ message: 'Content submitted successfully' });
  } catch (error) {
    console.error('Failed to submit content:', error);
    res.status(500).json({ error: 'Failed to submit content' });
  }
});

// eslint-disable-next-line no-unused-vars
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
