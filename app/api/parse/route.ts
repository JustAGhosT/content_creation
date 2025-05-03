import { NextResponse } from 'next/server';
import { withErrorHandling, Errors } from '../_utils/errors';
import { isAuthenticated } from '../_utils/auth';
import { createLogEntry, logToAuditTrail } from '../_utils/audit';
import axios from 'axios';

// Import feature flags
// Note: Adjust the import path as needed for your project structure
import featureFlags from '../../../utils/featureFlags';

// Helper function to get API endpoints with fallbacks
const getApiEndpoints = () => {
  return {
    deepseek: process.env.DEEPSEEK_API_ENDPOINT,
    openai: process.env.OPENAI_API_ENDPOINT,
    azure: process.env.AZURE_CONTENT_API_ENDPOINT
  };
};

// Validate environment variables
function validateEnvironmentVariables(): boolean {
  const requiredVars = [
    'DEEPSEEK_API_ENDPOINT',
    'OPENAI_API_ENDPOINT',
    'AZURE_CONTENT_API_ENDPOINT'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    return false;
  }
  
  return true;
}

// Parse text endpoint
export const POST = withErrorHandling(async (request: Request) => {
  // Check authentication
  if (!isAuthenticated()) {
    return Errors.unauthorized('Authentication required to parse text');
  }
  
  // Check if text parser feature is enabled
  if (!featureFlags.textParser?.enabled) {
    return Errors.forbidden('Text parser feature is disabled');
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
  
  // Validate environment variables
  if (!validateEnvironmentVariables()) {
    return Errors.internalServerError('Text parser service is not properly configured');
  }
  
  try {
    const body = await request.json();
    const { rawInput } = body;
    
    // Validate input
    if (!rawInput || typeof rawInput !== 'string') {
      return Errors.badRequest('Invalid input: rawInput must be a non-empty string');
    }
    
    // Check input size
    if (rawInput.length > 1000000) {
      return Errors.badRequest('Input too large', { maxSize: 1000000, actualSize: rawInput.length });
    }
    
    // Log the parse request
    await logToAuditTrail(createLogEntry('PARSE_TEXT', { inputLength: rawInput.length }));
    
    // Parse the input
    let parsedData;
    try {
      parsedData = JSON.parse(rawInput);
    } catch (error) {
      return Errors.badRequest('Invalid JSON input');
    }
    
    // Get API endpoints
    const apiEndpoints = getApiEndpoints();
    
    // Determine which implementation to use based on feature flags
    let response;
    const implementation = featureFlags.textParser.implementation;
    
    if (implementation === 'deepseek') {
      response = await axios.post(
        apiEndpoints.deepseek!,
        { data: parsedData }
      );
    } else if (implementation === 'openai') {
      response = await axios.post(
        apiEndpoints.openai!,
        { data: parsedData }
      );
    } else if (implementation === 'azure') {
      response = await axios.post(
        apiEndpoints.azure!,
        { data: parsedData }
      );
    } else {
      return Errors.badRequest('Invalid text parser implementation');
    }
    
    // Log successful parsing
    await logToAuditTrail(createLogEntry('PARSE_TEXT_SUCCESS', { implementation }));
    
    // Return the parsed data
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Parse error:', error);
    
    let status = 500;
    let message = 'Failed to parse text';
    
    if (axios.isAxiosError(error) && error.response) {
      status = error.response.status || 500;
      message = error.response.data?.error || error.response.statusText || message;
    } else if (axios.isAxiosError(error) && error.request) {
      message = 'No response received from upstream service';
    } else if (error instanceof Error) {
      message = error.message;
    }
    
    // Log parsing failure
    await logToAuditTrail(createLogEntry('PARSE_TEXT_FAILURE', { 
      error: message,
      implementation: featureFlags.textParser.implementation
    }));
    
    return Errors.createErrorResponse(message, status, {
      service: featureFlags.textParser.implementation
    });
  }
});

// Analyze parsed data endpoint
export const PUT = withErrorHandling(async (request: Request) => {
  // Check authentication
  if (!isAuthenticated()) {
    return Errors.unauthorized('Authentication required to analyze text');
  }
  
  try {
    const body = await request.json();
    const { parsedData } = body;
    
    // Validate input
    if (!parsedData || typeof parsedData !== 'object' || Array.isArray(parsedData)) {
      return Errors.badRequest('Invalid input: parsedData must be a non-empty object');
    }
    
    // Log the analyze request
    await logToAuditTrail(createLogEntry('ANALYZE_PARSED_DATA', { 
      keyCount: Object.keys(parsedData).length 
    }));
    
    // Analyze the data
    const keyCount = Object.keys(parsedData).length;
    const valueTypes: { [key: string]: string } = {};
    
    for (const [key, value] of Object.entries(parsedData)) {
      valueTypes[key] = Array.isArray(value) ? 'array' : typeof value;
    }
    
    // Return the analysis
    return NextResponse.json({
      keyCount,
      valueTypes
    });
  } catch (error) {
    console.error('Analysis error:', error);
    
    // Log analysis failure
    await logToAuditTrail(createLogEntry('ANALYZE_PARSED_DATA_FAILURE', { 
      error: (error as Error).message
    }));
    
    return Errors.internalServerError('Failed to analyze text', {
      service: featureFlags?.textParser?.implementation
    });
  }
});
