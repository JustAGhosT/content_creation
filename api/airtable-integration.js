const express = require('express');
const router = express.Router();
const Airtable = require('airtable');

// Initialize Airtable
// Validate required environment variables
if (
  !process.env.AIRTABLE_API_KEY ||
  !process.env.AIRTABLE_BASE_ID ||
  !process.env.AIRTABLE_TABLE_NAME
) {
  console.error('Missing required Airtable environment variables');
  process.exit(1);
}

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
  process.env.AIRTABLE_BASE_ID
);
const table = base(process.env.AIRTABLE_TABLE_NAME);

// Endpoint to store published content
router.post('/store-content', async (req, res) => {
  const { content } = req.body;

  // Validate input
  if (!content) {
    return res.status(400).json({ message: 'Content is required' });
  }

  try {
    const record = await table.create({ Content: content });
    // Return only necessary information to avoid exposing sensitive data
    res.status(200).json({
      message: 'Content stored successfully',
      recordId: record.id
    });
  } catch (error) {
    console.error('Airtable storage error:', error);
    res.status(500).json({ message: 'Error storing content', error: error.message });
  }
});

// Endpoint to track published content
router.get('/track-content', async (req, res) => {
  const { page = 1, pageSize = 20 } = req.query;
  const offset = (page - 1) * pageSize;

  try {
    const records = await table.select({
      maxRecords: parseInt(pageSize),
      offset: parseInt(offset)
    }).all();
    
    // Get total count for pagination metadata
    const totalRecords = await table.select().all();
    
    res.status(200).json({
      data: records,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalRecords: totalRecords.length,
        totalPages: Math.ceil(totalRecords.length / pageSize)
      }
    });
  } catch (error) {
    console.error('Airtable retrieval error:', error);
    res.status(500).json({ message: 'Error tracking content', error: error.message });
  }
});

// Endpoint to provide analytics interface
router.get('/analytics', async (req, res) => {
  const { page = 1, pageSize = 20 } = req.query;
  const offset = (page - 1) * pageSize;

  try {
    const records = await table.select({
      maxRecords: parseInt(pageSize),
      offset: parseInt(offset)
    }).all();

    // Get total count for pagination metadata
    const totalRecords = await table.select().all();

    const analytics = records.map(record => ({
      id: record.id,
      content: record.fields.Content,
      createdTime: record.fields.createdTime || new Date().toISOString()
    }));

    res.status(200).json({
      data: analytics,
      pagination: {
        page: parseInt(page),
        pageSize: parseInt(pageSize),
        totalRecords: totalRecords.length,
        totalPages: Math.ceil(totalRecords.length / pageSize)
      }
    });
  } catch (error) {
    console.error('Airtable analytics error:', error);
    res.status(500).json({ message: 'Error fetching analytics', error: error.message });
  }
});

module.exports = router;
