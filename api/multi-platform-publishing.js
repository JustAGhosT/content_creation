const express = require('express');
const router = express.Router();
const axios = require('axios');
const { featureFlags } = require('./feature-flags');

// Endpoint to publish content to multiple platforms
router.post('/publish-content', async (req, res) => {
  const { content, platforms } = req.body;
  try {
    // Ensure connectors are globally enabled
    if (!featureFlags.platformConnectors) {
      return res.status(400).json({ error: 'Platform connectors are disabled' });
    }

    // Whitelist valid platform keys
    const validPlatforms = ['facebook', 'instagram', 'linkedin', 'twitter', 'custom'];
    const endpoints = {
      facebook:  'https://api.facebook.com/publish',
      instagram: 'https://api.instagram.com/publish',
      linkedin:  'https://api.linkedin.com/publish',
      twitter:   'https://api.twitter.com/publish',
      custom:    'https://api.custom-channel.com/publish'
    };

    for (const platform of platforms) {
      const key = platform.toLowerCase();
      if (!validPlatforms.includes(key)) {
        return res.status(400).json({ error: `Invalid platform: ${platform}` });
      }
      await axios.post(endpoints[key], { content });
    }

    res.status(200).json({ message: 'Content published successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to publish content' });
  }
});

// Endpoint to add content to pre-publishing queue
router.post('/add-to-queue', async (req, res) => {
  const { content, platforms } = req.body;

  // Validate input
  if (!content || !platforms || !Array.isArray(platforms) || platforms.length === 0) {
    return res.status(400).json({ error: 'Invalid content or platforms' });
  }

  try {
    // Example: Store in database
    // const queueItem = await Queue.create({ content, platforms, status: 'pending', createdAt: new Date() });
    
    // For MVP/simulation purposes, you could use an in-memory store
    if (!global.publishingQueue) {
      global.publishingQueue = [];
    }
    const queueItem = { id: Date.now(), content, platforms, status: 'pending', createdAt: new Date() };
    global.publishingQueue.push(queueItem);
    
    // Log for debugging purposes only
    console.log(`Added item ${queueItem.id} to queue with ${platforms.length} platforms`);
    
    res.status(200).json({ message: 'Content added to queue successfully' });
  } catch (error) {
    console.error('Failed to add content to queue:', error);
    res.status(500).json({ error: 'Failed to add content to queue' });
  }
});

// Endpoint to approve content in pre-publishing queue
router.post('/approve-queue', async (req, res) => {
  const { queue } = req.body;

  // Validate input
  if (!queue || !Array.isArray(queue) || queue.length === 0) {
    return res.status(400).json({ error: 'Invalid queue data' });
  }

  try {
    // Validate that platformConnectors feature is enabled
    if (!featureFlags.platformConnectors) {
      return res.status(400).json({ error: 'Platform connectors are not enabled' });
    }

    const validPlatforms = ['facebook', 'instagram', 'linkedin', 'twitter', 'custom'];
    const platformConfig = {
      facebook: 'https://api.facebook.com/publish',
      instagram: 'https://api.instagram.com/publish',
      linkedin: 'https://api.linkedin.com/publish',
      twitter: 'https://api.twitter.com/publish',
      custom: 'https://api.custom-channel.com/publish'
    };

    for (const item of queue) {
      // Validate each queue item has required properties
      if (!item.platform || !item.content) {
        return res.status(400).json({ error: 'Invalid queue item: missing platform or content' });
      }

      // Validate platform name against a whitelist
      const platformKey = item.platform.toLowerCase();
      if (!validPlatforms.includes(platformKey)) {
        return res.status(400).json({ error: `Invalid platform: ${item.platform}` });
      }

      await axios.post(platformConfig[platformKey], { content: item.content });
    }

    // Optionally update queue items status in in-memory store
    if (global.publishingQueue) {
      const queueIds = queue.map(item => item.id);
      global.publishingQueue = global.publishingQueue.map(item =>
        queueIds.includes(item.id) ? { ...item, status: 'published', publishedAt: new Date() } : item
      );
    }

    res.status(200).json({ message: 'Queue approved and content published successfully' });
  } catch (error) {
    console.error('Failed to approve queue:', error);
    res.status(500).json({ error: 'Failed to approve queue' });
  }
});

module.exports = router;
