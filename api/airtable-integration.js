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
router.post('/store-content', async (req, res) => {
  const { content } = req.body;

  // Validate input
  if (!content || typeof content !== 'string' || content.trim() === '') {
    return res.status(400).json({ message: 'Content is required' });
  }

  // Sanitize the content (basic example - use a proper sanitizer in production)
  const sanitizedContent = content.trim();

  try {
+    const record = await table.create({ Content: sanitizedContent });
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

initializeAirtable();
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
  const offset = (page - 1) * pageSize;
  const pageNum = parseInt(page, 10);
  const pageSizeNum = parseInt(pageSize, 10);

  // Validate pagination parameters
  if (isNaN(pageNum) || pageNum < 1) {
    return res.status(400).json({ message: 'Invalid page number' });
  }
  if (isNaN(pageSizeNum) || pageSizeNum < 1 || pageSizeNum > 100) {
    return res.status(400).json({ message: 'Invalid page size (must be between 1-100)' });
  }

  try {
    // Create query filter if provided
    const filterFormula = filter ? `FIND("${filter.replace(/"/g, '\\"')}", Content)` : '';

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

// Endpoint to provide analytics interface
router.get('/analytics', async (req, res) => {
  const { page = 1, pageSize = 20, startDate, endDate } = req.query;
  const offset = (page - 1) * pageSize;
  const pageNum = parseInt(page, 10);
  const pageSizeNum = parseInt(pageSize, 10);

  // Validate pagination parameters
  if (isNaN(pageNum) || pageNum < 1) {
    return res.status(400).json({ message: 'Invalid page number' });
  }
  if (isNaN(pageSizeNum) || pageSizeNum < 1 || pageSizeNum > 100) {
    return res.status(400).json({ message: 'Invalid page size (must be between 1-100)' });
  }

  try {
    // Build filter formula for date range, if provided
    let filterFormula = '';
    if (startDate && endDate) {
      filterFormula = `AND(
        IS_AFTER({createdTime}, "${startDate}"),
        IS_BEFORE({createdTime}, "${endDate}")
      )`;
    } else if (startDate) {
      filterFormula = `IS_AFTER({createdTime}, "${startDate}")`;
    } else if (endDate) {
      filterFormula = `IS_BEFORE({createdTime}, "${endDate}")`;
    }

    // Prepare query options, fetch one extra record to detect more pages
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

    // Determine if there's another page
    const hasMore = records.length > pageSizeNum;
    const resultsToReturn = hasMore ? records.slice(0, pageSizeNum) : records;

    const analytics = resultsToReturn.map(record => ({
      id: record.id,
      content: record.fields.Content,
      createdTime: record.fields.createdTime || record.createdTime || new Date().toISOString(),
      metrics: record.fields.Metrics || {},
      createdBy: record.fields.CreatedBy
    }));

    res.status(200).json({
      data: analytics,
      pagination: {
        page: pageNum,
        pageSize: pageSizeNum,
        hasMorePages: hasMore
      }
    });
  } catch (error) {
    console.error('Airtable analytics error:', error);
    res.status(500).json({ message: 'Error fetching analytics', error: error.message });
  }

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

});

module.exports = router;
