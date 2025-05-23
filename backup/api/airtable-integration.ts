import express, { Request, Response, NextFunction } from 'express';
const router = express.Router();
import Airtable, { FieldSet, Records, Table } from 'airtable';

interface ContentRequest extends Request {
  body: {
    content: string;
  };
}

interface TrackContentRequest extends Request {
  query: {
    page?: string;
    pageSize?: string;
    filter?: string;
    nextToken?: string;
  };
}

interface QueryOptions {
  maxRecords: number;
  pageSize: number;
  offset?: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  hasMorePages: boolean;
}

interface TrackContentResponse {
  data: Records<FieldSet>;
  pagination: Pagination;
}

// Initialize Airtable
let base: Airtable.Base | undefined;
let table: Table<FieldSet> | undefined;

function initializeAirtable(): boolean {
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
const checkAirtableInitialized = (req: Request, res: Response, next: NextFunction) => {
  if (!base || !table) {
    return res.status(503).json({
      message: 'Airtable integration not available',
      error: 'Missing configuration or initialization failed'
    });
  }
  next();
};

// Middleware to validate content in request body
function validateContent(req: ContentRequest, res: Response, next: NextFunction) {
  const { content } = req.body;
  if (!content || typeof content !== 'string' || content.trim() === '') {
    return res.status(400).json({ message: 'Content is required and must be a non-empty string.' });
  }
  req.body.content = content.trim();
  next();
}

// Endpoint to store published content
router.post('/store-content', checkAirtableInitialized, validateContent, async (req: ContentRequest, res: Response) => {
  const { content } = req.body;

  try {
    const record = await table!.create({ Content: content });
    res.status(200).json({
      message: 'Content stored successfully',
      recordId: record.id
    });
  } catch (error) {
    console.error('Airtable storage error:', error);
    res.status(500).json({ message: 'Error storing content', error: error.message });
  }
});

// Attempt to initialize Airtable on startup
if (!initializeAirtable()) {
  console.error('Airtable failed to initialize at startup.');
}

// Endpoint to track published content
router.get('/track-content', checkAirtableInitialized, async (req: TrackContentRequest, res: Response) => {
  const { page = '1', pageSize = '20', filter = '' } = req.query;
  const pageNum = parseInt(page, 10);
  const pageSizeNum = parseInt(pageSize, 10);

  if (isNaN(pageNum) || pageNum < 1) {
    return res.status(400).json({ message: 'Invalid page number' });
  }
  if (isNaN(pageSizeNum) || pageSizeNum < 1 || pageSizeNum > 100) {
    return res.status(400).json({ message: 'Invalid page size (must be between 1-100)' });
  }

  try {
    const queryOptions: QueryOptions = {
      maxRecords: pageSizeNum + 1,
      pageSize: pageSizeNum + 1
    };

    if (req.query.nextToken) {
      queryOptions.offset = req.query.nextToken;
    }

    let records = await table!.select(queryOptions).all();

    if (filter && typeof filter === 'string' && filter.trim() !== '') {
      const filterLower = filter.trim().toLowerCase();
      records = records.filter(record => {
        const content = (record.fields.Content || '').toLowerCase();
        return content.includes(filterLower);
      });
    }

    const hasMore = records.length > pageSizeNum;
    const resultsToReturn = hasMore ? records.slice(0, pageSizeNum) : records;

    const response: TrackContentResponse = {
      data: resultsToReturn,
      pagination: {
        page: pageNum,
        pageSize: pageSizeNum,
        hasMorePages: hasMore
      }
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Airtable retrieval error:', error);
    res.status(500).json({ message: 'Error tracking content', error: error.message });
  }
});

export default router;
