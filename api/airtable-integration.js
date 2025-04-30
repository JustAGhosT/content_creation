const express = require('express');
const router = express.Router();
const Airtable = require('airtable');
const { authenticateUser } = require('./authenticationHelpers');

// Initialize Airtable
// Validate required environment variables
let base;
let table;

function initializeAirtable() {
  if (
    !process.env.AIRTABLE_API_KEY ||
    !process.env.AIRTABLE_BASE_ID ||
    !process.env.AIRTABLE_TABLE_NAME
  ) {
    console.error('Missing required Airtable environment variables');
    return false;
  }

  try {
    base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(
      process.env.AIRTABLE_BASE_ID
    );
    table = base(process.env.AIRTABLE_TABLE_NAME);
    return true;
  } catch (error) {
    console.error('Failed to initialize Airtable:', error);
    return false;
  }
}

// Middleware to check if Airtable is initialized
const checkAirtableInitialized = (req, res, next) => {
  if (!base || !table) {
    return res.status(503).json({
      message: 'Airtable integration not available',
      error: 'Missing configuration or initialization failed'
    });
  }
  next();
};

// Apply middleware to all routes
router.use(authenticateUser);
router.use(checkAirtableInitialized);

// Endpoint to store published content
router.post('/store-content', validateContent, async (req, res) => {
  const { content } = req.body;

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

/**
 * Helper middleware to validate content in the request body.
 */
function validateContent(req, res, next) {
  const { content } = req.body;
  if (!content || typeof content !== 'string' || content.trim() === '') {
    return res.status(400).json({ message: 'Content is required and must be a non-empty string.' });
  }
  req.body.content = content.trim();
  next();
}

// Attempt to initialize Airtable on startup
if (!initializeAirtable()) {
  console.error('Airtable failed to initialize at startup.');
}

// Endpoint to track published content
router.get('/track-content', async (req, res) => {
  const { page = 1, pageSize = 20, filter = '' } = req.query;
  const pageNum = parseInt(page, 10);
  const pageSizeNum = parseInt(pageSize, 10);
  const offset = (pageNum - 1) * pageSizeNum;

  // Validate pagination parameters
  if (isNaN(pageNum) || pageNum < 1) {
    return res.status(400).json({ message: 'Invalid page number' });
  }
  if (isNaN(pageSizeNum) || pageSizeNum < 1 || pageSizeNum > 100) {
    return res.status(400).json({ message: 'Invalid page size (must be between 1-100)' });
  }

  try {
    // Sanitize filter parameter more thoroughly for Airtable formula syntax
    const sanitizedFilter = filter.replace(/['"\\]/g, ''); // Remove quotes and backslashes
    const filterFormula = sanitizedFilter ? `FIND("${sanitizedFilter}", Content)` : '';

    // Get one more record than requested to determine if there are more pages
    const queryOptions = {
      maxRecords: pageSizeNum + 1,
      pageSize: pageSizeNum + 1
    };

    if (offset > 0) {
      queryOptions.offset = offset;
    }

    if (filterFormula) {
      queryOptions.filterByFormula = filterFormula;
    }

    const records = await table.select(queryOptions).all();

    // Check if there are more pages
    const hasMore = records.length > pageSizeNum;
    const resultsToReturn = hasMore ? records.slice(0, pageSizeNum) : records;

    res.status(200).json({
      data: resultsToReturn,
      pagination: {
        page: pageNum,
        pageSize: pageSizeNum,
        hasMorePages: hasMore
      }
    });
  } catch (error) {
    console.error('Airtable retrieval error:', error);
    res.status(500).json({ message: 'Error tracking content', error: error.message });
  }
});

module.exports = router;
