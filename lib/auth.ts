import { NextRequest, NextResponse } from 'next/server';
import { Table, FieldSet } from 'airtable';
import { featureFlags } from '@/lib/feature-flags';

/**
 * Higher-order function that wraps a handler with authentication and feature flag checks
 * @param featureFlag The feature flag to check
 * @param handler The handler function to wrap
 * @returns A wrapped handler function
 */
export function withAuthAndFeature(
  featureFlag: keyof typeof featureFlags,
  handler: (request: NextRequest, airtableTable: Table<FieldSet>) => Promise<NextResponse>
): (request: NextRequest, context?: { params: Record<string, string> }) => Promise<NextResponse> {
  return async (request: NextRequest, context?: { params: Record<string, string> }) => {
    // Check if the feature flag is enabled
    if (!featureFlags[featureFlag]) {
      return new NextResponse(
        JSON.stringify({ error: `Feature ${featureFlag} is not enabled` }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Authenticate the request
    // ... your authentication logic here ...
    
    // If authentication passes, get the Airtable table
    const airtableTable = getAirtableTable(); // Replace with your actual function
    
    // Call the handler with the request and Airtable table
    return handler(request, airtableTable);
  };
}

// Mock function - replace with your actual implementation
function getAirtableTable(): Table<FieldSet> {
  // Return your Airtable table
  return {} as Table<FieldSet>;
}