const express = require('express');
const router = express.Router();
const Airtable = require('airtable');

// Initialize Airtable
const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID);
const table = base(process.env.AIRTABLE_TABLE_NAME);

// Endpoint to store published content
router.post('/store-content', async (req, res) => {
  const { content } = req.body;

  try {
    const record = await table.create({ Content: content });
    res.status(200).json({ message: 'Content stored successfully', record });
  } catch (error) {
    res.status(500).json({ message: 'Error storing content', error: error.message });
  }
});

// Endpoint to track published content
router.get('/track-content', async (req, res) => {
  try {
    const records = await table.select().all();
    res.status(200).json(records);
  } catch (error) {
    res.status(500).json({ message: 'Error tracking content', error: error.message });
  }
});

// Endpoint to provide analytics interface
router.get('/analytics', async (req, res) => {
  try {
    const records = await table.select().all();
    const analytics = records.map(record => ({
      id: record.id,
      content: record.fields.Content,
      createdTime: record._rawJson.createdTime
    }));
    res.status(200).json(analytics);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching analytics', error: error.message });
  }
});

module.exports = router;
