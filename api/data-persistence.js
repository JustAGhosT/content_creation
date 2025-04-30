const express = require('express');
const router = express.Router();
const Airtable = require('airtable');
const featureFlags = global.featureFlags || {};

// Initialize Airtable
let airtableInitialized = false;
let table;

if (!process.env.AIRTABLE_API_KEY ||
  !process.env.AIRTABLE_BASE_ID ||
  !process.env.AIRTABLE_TABLE_NAME) {
  console.error('Missing required Airtable environment variables');
} else {
  const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
  .base(process.env.AIRTABLE_BASE_ID);
  table = base(process.env.AIRTABLE_TABLE_NAME);
airtableInitialized = true;
  table = base(process.env.AIRTABLE_TABLE_NAME);
  airtableInitialized = true;
}

// Endpoint to store published content
router.post('/store-content', async (req, res) => {
  if (!featureFlags.airtableIntegration) {
    return res.status(403).json({ message: 'Airtable integration is disabled' });
  }

  const { content } = req.body;

  if (!content) {
    return res.status(400).json({ message: 'Content is required' });
  }

  try {
    const record = await table.create({ Content: content });
    res.status(200).json({ message: 'Content stored successfully', record });
  } catch (error) {
    console.error('Error storing content:', error);
    res.status(500).json({ message: 'Error storing content' });
    }
  });

  // Endpoint to provide paginated list of tracked content (v2)
  router.get('/track-content-page', async (req, res) => {
    if (!featureFlags.airtableIntegration) {
      return res.status(403).json({ message: 'Airtable integration is disabled' });
    }
  
    const { pageSize = 20, offset } = req.query;
  
    try {
      const result = await table.select({
        pageSize: parseInt(pageSize, 10),
        offset: offset || undefined
      }).firstPage();
  
      // Get the next offset for pagination
      const nextOffset = result.length === parseInt(pageSize, 10) ? result[result.length - 1].getId() : null;
  
      res.status(200).json({
        records: result,
        nextOffset
      });
    } catch (error) {
      console.error('Error tracking content:', error);
      res.status(500).json({ message: 'Error tracking content' });
    }
  });
  
  // Endpoint to provide analytics interface with pagination
  router.get('/analytics', async (req, res) => {
    if (!featureFlags.airtableIntegration) {
      return res.status(403).json({ message: 'Airtable integration is disabled' });
    }
  
    const { pageSize = 20, offset } = req.query;
  
    try {
      const result = await table.select({
        pageSize: parseInt(pageSize, 10),
        offset: offset || undefined
      }).firstPage();
  
      const analytics = result.map(record => ({
        id: record.id,
        content: record.fields.Content,
        createdTime: record.fields.createdTime || record.createdTime
      }));
  
      // Get the next offset for pagination
      const nextOffset = result.length === parseInt(pageSize, 10) ? result[result.length - 1].getId() : null;
  
      res.status(200).json({
        analytics,
        nextOffset
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      res.status(500).json({ message: 'Error fetching analytics', error: error.message });
    }
  });
  

module.exports = router;
