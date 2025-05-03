import { NextResponse } from 'next/server';
import { withErrorHandling, Errors } from '../_utils/errors';
import { isAuthenticated } from '../_utils/auth';
import { createLogEntry, logToAuditTrail } from '../_utils/audit';
import { validateString } from '../_utils/validation';
import Airtable, { FieldSet, Records } from 'airtable';

// Import feature flags
// Note: Adjust the import path as needed for your project structure
import featureFlags from '../../../utils/featureFlags';

// Interface definitions
interface Pagination {
  page: number;
  pageSize: number;
  hasMorePages: boolean;
}

interface TrackContentResponse {
  data: Records<FieldSet>;
  pagination: Pagination;
}

interface QueryOptions {
  maxRecords: number;
  pageSize: number;
  offset?: string;
}

// Initialize Airtable
let base: Airtable.Base | undefined;
let table: Airtable.Table<FieldSet> | undefined;

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

// Check if Airtable is initialized
function checkAirtableInitialized(): boolean {
  if (!base || !table) {
    if (!initializeAirtable()) {
      return false;
    }
  }
  return true;
}

// Store content endpoint
export const POST = withErrorHandling(async (request: Request) => {
  // Check authentication
  if (!isAuthenticated()) {
    return Errors.unauthorized('Authentication required to store content');
  }
  
  // Check if Airtable integration feature is enabled
  if (!featureFlags.airtableIntegration) {
    return Errors.forbidden('Airtable integration feature is disabled');
  }
  
  // Check if Airtable is initialized
  if (!checkAirtableInitialized()) {
    return Errors.internalServerError('Airtable integration not available');
  }
  
  // Check feature flags
  if (!featureFlags.trigger.cron.enabled) {
    return Errors.forbidden('CRON trigger feature is disabled');
  }
  
  if (!featureFlags.trigger.rss.enabled) {
    return Errors.forbidden('RSS trigger feature is disabled');
  }
  
  if (!featureFlags.scraping.enabled) {
    return Errors.forbidden('Scraping feature is disabled');
  }
  
  if (!featureFlags.storage.notion.enabled) {
    return Errors.forbidden('Notion storage feature is disabled');
  }
  
  if (!featureFlags.writing.openai.enabled) {
    return Errors.forbidden('OpenAI writing feature is disabled');
  }
  
  if (!featureFlags.distribution.telegram.enabled) {
    return Errors.forbidden('Telegram distribution feature is disabled');
  }
  
  try {
    const body = await request.json();
    const { content } = body;
    
    // Validate input
    const contentError = validateString(content, 'Content');
    if (contentError) {
      return Errors.badRequest(contentError);
    }
    
    // Log the content storage request
    await logToAuditTrail(createLogEntry('STORE_CONTENT', { contentLength: content.length }));
    
    // Store the content in Airtable
    const record = await table!.create({ Content: content });
    
    // Log successful content storage
    await logToAuditTrail(createLogEntry('STORE_CONTENT_SUCCESS', { recordId: record.id }));
    
    // Return success response
    return NextResponse.json({
      message: 'Content stored successfully',
      recordId: record.id
    });
  } catch (error) {
    console.error('Airtable storage error:', error);
    
    // Log content storage failure
    await logToAuditTrail(createLogEntry('STORE_CONTENT_FAILURE', { 
      error: (error as Error).message
    }));
    
    return Errors.internalServerError('Error storing content', {
      details: (error as Error).message
    });
  }
});

// Track content endpoint
export const GET = withErrorHandling(async (request: Request) => {
  // Check authentication
  if (!isAuthenticated()) {
    return Errors.unauthorized('Authentication required to track content');
  }
  
  // Check if Airtable integration feature is enabled
  if (!featureFlags.airtableIntegration) {
    return Errors.forbidden('Airtable integration feature is disabled');
  }
  
  // Check if Airtable is initialized
  if (!checkAirtableInitialized()) {
    return Errors.internalServerError('Airtable integration not available');
  }
  
  try {
    // Get query parameters
    const url = new URL(request.url);
    const page = url.searchParams.get('page') || '1';
    const pageSize = url.searchParams.get('pageSize') || '20';
    const filter = url.searchParams.get('filter') || '';
    const nextToken = url.searchParams.get('nextToken') || undefined;
    
    // Parse and validate pagination parameters
    const pageNum = parseInt(page, 10);
    const pageSizeNum = parseInt(pageSize, 10);
    
    if (isNaN(pageNum) || pageNum < 1) {
      return Errors.badRequest('Invalid page number');
    }
    
    if (isNaN(pageSizeNum) || pageSizeNum < 1 || pageSizeNum > 100) {
      return Errors.badRequest('Invalid page size (must be between 1-100)');
    }
    
    // Log the track content request
    await logToAuditTrail(createLogEntry('TRACK_CONTENT', { 
      page: pageNum,
      pageSize: pageSizeNum,
      filter: filter || undefined,
      nextToken: nextToken || undefined
    }));
    
    // Set up query options
    const queryOptions: QueryOptions = {
      maxRecords: pageSizeNum + 1,
      pageSize: pageSizeNum + 1
    };
    
    if (nextToken) {
      queryOptions.offset = nextToken;
    }
    
    // Fetch records from Airtable
    let records = await table!.select(queryOptions).all();
    
    // Apply filter if provided
    if (filter && filter.trim() !== '') {
      const filterLower = filter.trim().toLowerCase();
      records = records.filter(record => {
        const content = (record.fields.Content as string || '').toLowerCase();
        return content.includes(filterLower);
      });
    }
    
    // Check if there are more pages
    const hasMore = records.length > pageSizeNum;
    const resultsToReturn = hasMore ? records.slice(0, pageSizeNum) : records;
    
    // Prepare response
    const response: TrackContentResponse = {
      data: resultsToReturn,
      pagination: {
        page: pageNum,
        pageSize: pageSizeNum,
        hasMorePages: hasMore
      }
    };
    
    // Log successful content tracking
    await logToAuditTrail(createLogEntry('TRACK_CONTENT_SUCCESS', { 
      recordCount: resultsToReturn.length,
      hasMore
    }));
    
    // Return the content records
    return NextResponse.json(response);
  } catch (error) {
    console.error('Airtable retrieval error:', error);
    
    // Log content tracking failure
    await logToAuditTrail(createLogEntry('TRACK_CONTENT_FAILURE', { 
      error: (error as Error).message
    }));
    
    return Errors.internalServerError('Error tracking content', {
      details: (error as Error).message
    });
  }
});
