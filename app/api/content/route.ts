import { NextRequest, NextResponse } from 'next/server';
import { createLogEntry, logToAuditTrail } from '../_utils/audit';
import { isAuthenticated } from '../_utils/auth';
import { Errors } from '../_utils/errors';
import { validateString } from '../_utils/validation';

// Import feature flags
import featureFlags from '../../../utils/featureFlags';
import Airtable, { FieldSet, Records } from 'airtable';

// Interface definitions
interface Pagination {
  page: number;
  pageSize: number;
  hasMorePages: boolean;
  nextToken?: string;
}

interface TrackContentResponse {
  data: Records<FieldSet>;
  pagination: Pagination;
}

// Define our own query params interface to match what Airtable actually expects
interface AirtableQueryParams {
  maxRecords?: number;
  pageSize?: number;
  offset?: string;  // Airtable API actually expects string for offset
  view?: string;
  filterByFormula?: string;
  sort?: any[];
  fields?: string[];
}

// Error type guard
function isError(error: unknown): error is Error {
  return error instanceof Error || (typeof error === 'object' && 
         error !== null && 'message' in error);
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

// Helper function to check auth and feature flag
async function checkAuthAndFeature(featureFlag: keyof typeof featureFlags) {
  // Check authentication
  if (!(await isAuthenticated())) {
    return Errors.unauthorized('Authentication required');
  }
  
  // Check if feature is enabled
  if (!featureFlags[featureFlag]) {
    return Errors.forbidden(`${featureFlag} feature is disabled`);
  }
  
  // Check if Airtable is initialized
  if (!checkAirtableInitialized() || !table) {
    return Errors.internalServerError('Airtable integration not available');
  }
  
  return null; // No error
}
    
export async function POST(request: Request) {
  try {
    // Check auth and feature flag
    const error = await checkAuthAndFeature('airtableIntegration');
    if (error) return error;

    // Convert to NextRequest to use convenience methods if needed
    const nextRequest = request as unknown as NextRequest;
    const body = await request.json();
    const { content } = body;
    
    // Validate input
    const contentError = validateString(content, 'Content');
    if (contentError) {
      return Errors.badRequest(contentError);
    }
    
    // Log the content storage request
    await logToAuditTrail(await createLogEntry('STORE_CONTENT', { contentLength: content.length }));
    // Store the content in Airtable
    if (!table) {
      return Errors.internalServerError('Airtable table not available');
    }
    const record = await table.create({ Content: content });
    
    // Log successful content storage
    await logToAuditTrail(await createLogEntry('STORE_CONTENT_SUCCESS', { recordId: record.id }));
    
    // Return success response with 201 Created status
    return NextResponse.json(
      { message: 'Content stored successfully', recordId: record.id },
      { status: 201 }
    );
  } catch (error) {
    console.error('Airtable storage error:', error);
    
    // Log content storage failure
    const errorMessage = isError(error) ? error.message : 'Unknown error';
    await logToAuditTrail(await createLogEntry('STORE_CONTENT_FAILURE', { error: errorMessage }));
    return Errors.internalServerError('Error storing content', {
      details: errorMessage
    });
  }
}

export async function GET(request: Request) {
  try {
    // Check auth and feature flag
    const error = await checkAuthAndFeature('airtableIntegration');
    if (error) return error;

    // Convert to NextRequest to use convenience methods if needed
    const nextRequest = request as unknown as NextRequest;
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
    await logToAuditTrail(await createLogEntry('TRACK_CONTENT', { 
      page: pageNum,
      pageSize: pageSizeNum,
      filter: filter || undefined,
      nextToken: nextToken || undefined
    }));
    
    // Set up query options
    const queryOptions: AirtableQueryParams = {
      maxRecords: pageSizeNum + 1,
      pageSize: pageSizeNum + 1
    };
    
    if (nextToken) {
      queryOptions.offset = nextToken;
    }
    
    // Fetch records from Airtable
    if (!table) {
      return Errors.internalServerError('Airtable table not available');
    }
    // Use type assertion here since we know our params match what Airtable expects
    let records = await table.select(queryOptions as any).all();
    
    // Apply filter if provided
    if (filter && filter.trim() !== '') {
      const filterLower = filter.trim().toLowerCase();
      records = records.filter(record => {
        const content = ((record.fields.Content as string) || '').toLowerCase();
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
        hasMorePages: hasMore,
        nextToken: hasMore ? records[pageSizeNum].getId() : undefined
      }
    };
    
    // Log successful content tracking
    await logToAuditTrail(await createLogEntry('TRACK_CONTENT_SUCCESS', { 
      recordCount: resultsToReturn.length,
      hasMore
    }));
    
    // Return the content records
    return NextResponse.json(response);
  } catch (error) {
    console.error('Airtable retrieval error:', error);
    
    // Log content tracking failure
    const errorMessage = isError(error) ? error.message : 'Unknown error';
    await logToAuditTrail(await createLogEntry('TRACK_CONTENT_FAILURE', { error: errorMessage }));
    
    return Errors.internalServerError('Error tracking content', {
      details: errorMessage
    });
  }
}
