import express, { Request, Response } from 'express';
import Airtable from 'airtable';
import { FeatureFlags } from './feature-flags';

const router = express.Router();

interface FeatureFlagsConfig {
  airtableIntegration: boolean;
}

interface ContentRequest extends Request {
  body: {
    content: string;
  };
}

interface AnalyticsRequest extends Request {
  query: {
    pageSize?: string;
    offset?: string;
  };
}

interface AnalyticsResponse {
  id: string;
  content: string;
  createdTime: string;
}

// Define the Feedback interface
export interface Feedback {
  reviewId: string;
  feedback: string;
}

let airtableInitialized = false;
// Define a specific interface matching your Airtable schema
interface AirtableRecord {
  Content: string;
  createdTime?: string;
  // Add other fields that exist in your Airtable schema
}

let table: Airtable.Table<AirtableRecord>;
let feedbackTable: Airtable.Table<any>;

if (!process.env.AIRTABLE_API_KEY ||
  !process.env.AIRTABLE_BASE_ID ||
  !process.env.AIRTABLE_TABLE_NAME) {
  console.error('Missing required Airtable environment variables');
} else {
  const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY })
  .base(process.env.AIRTABLE_BASE_ID);
  table = base(process.env.AIRTABLE_TABLE_NAME);
  feedbackTable = base('Feedback'); // Assuming there's a Feedback table
  airtableInitialized = true;
}

// Endpoint to store published content
router.post('/store-content', async (req: ContentRequest, res: Response) => {
  if (!FeatureFlags.airtableIntegration) {
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
router.get('/track-content-page', async (req: AnalyticsRequest, res: Response) => {
  if (!FeatureFlags.airtableIntegration) {
    return res.status(403).json({ message: 'Airtable integration is disabled' });
  }

  const { pageSize = 20, offset } = req.query;

  try {
    const result = await table.select({
      pageSize: parseInt(pageSize, 10),
      offset: offset || undefined
    }).firstPage();

    // Get the next offset for pagination
    const pageSizeNum = parseInt(pageSize, 10);
    const nextOffset = result.length > 0 && result.length === (isNaN(pageSizeNum) ? 20 : pageSizeNum)
      ? result[result.length - 1].getId()
      : null;

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
router.get('/analytics', async (req: AnalyticsRequest, res: Response) => {
  if (!FeatureFlags.airtableIntegration) {
    return res.status(403).json({ message: 'Airtable integration is disabled' });
  }

  const { pageSize = 20, offset } = req.query;

  try {
    const result = await table.select({
      pageSize: parseInt(pageSize, 10),
      offset: offset || undefined
    }).firstPage();

    const analytics: AnalyticsResponse[] = result.map(record => ({
      id: record.id,
      content: record.fields.Content,
      createdTime: record.fields.createdTime || record.createdTime
    }));

    // Get the next offset for pagination - Fixed to handle empty array case
    const pageSizeNum = parseInt(pageSize, 10);
    const nextOffset = result.length > 0 && result.length === (isNaN(pageSizeNum) ? 20 : pageSizeNum)
      ? result[result.length - 1].getId()
      : null;

    res.status(200).json({
      analytics,
      nextOffset
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ message: 'Error fetching analytics', error: error.message });
  }
});

/**
 * Persist feedback for a given review.
 */
export async function saveFeedback({ reviewId, feedback }: Feedback): Promise<void> {
  if (!airtableInitialized) {
    throw new Error('Airtable is not initialized');
  }
  
  if (!FeatureFlags.airtableIntegration) {
    throw new Error('Airtable integration is disabled');
  }

  try {
    await feedbackTable.create({
      ReviewId: reviewId,
      Feedback: feedback,
      CreatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error saving feedback:', error);
    throw new Error('Failed to save feedback');
  }
}

/**
 * Retrieve feedback by reviewId.
 */
export async function getFeedback(filter: Partial<Feedback>): Promise<Feedback[]> {
  if (!airtableInitialized) {
    throw new Error('Airtable is not initialized');
  }
  
  if (!FeatureFlags.airtableIntegration) {
    throw new Error('Airtable integration is disabled');
  }

  try {
    let selectParams: any = {};
    
    if (filter.reviewId) {
      selectParams.filterByFormula = `{ReviewId} = '${filter.reviewId}'`;
    }

    const records = await feedbackTable.select(selectParams).all();
    
    return records.map(record => ({
      reviewId: record.get('ReviewId') as string,
      feedback: record.get('Feedback') as string
    }));
  } catch (error) {
    console.error('Error retrieving feedback:', error);
    throw new Error('Failed to retrieve feedback');
  }
}

export default router;