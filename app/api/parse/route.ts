import axios from 'axios';
import { NextResponse } from 'next/server';
import { createLogEntry, logToAuditTrail } from '../_utils/audit';
import { isAuthenticated } from '../_utils/auth';
import { Errors, withErrorHandling } from '../_utils/errors';

// Import feature flags
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
    const MAX_INPUT_LENGTH = 1_000_000; // 1 MB
    if (rawInput.length > MAX_INPUT_LENGTH) {
      return Errors.badRequest('Input too large', { maxSize: MAX_INPUT_LENGTH, actualSize: rawInput.length });
     }
    
    // Log the parse request
    const logEntry = await createLogEntry('PARSE_TEXT', { inputLength: rawInput.length });
    await logToAuditTrail(logEntry);
    
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
    const implementation = featureFlags.textParser.implementation;
    const endpointMap: Record<'deepseek' | 'openai' | 'azure', string | undefined> = {
      deepseek: apiEndpoints.deepseek,
      openai: apiEndpoints.openai,
      azure: apiEndpoints.azure
    };
    
    const endpoint = endpointMap[implementation as keyof typeof endpointMap];
    if (!endpoint) {
      return Errors.badRequest('Invalid text parser implementation');
    }
    
    const response = await axios.post(endpoint, { data: parsedData });
    
    // Log successful parsing
    const successLogEntry = await createLogEntry('PARSE_TEXT_SUCCESS', { implementation });
    await logToAuditTrail(successLogEntry);
    
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
    const errorLogEntry = await createLogEntry('PARSE_TEXT_FAILURE', { 
      error: message,
      implementation: featureFlags.textParser.implementation
    });
    await logToAuditTrail(errorLogEntry);
    
    // Use the appropriate error method based on status code
    if (status === 400) {
      return Errors.badRequest(message, { service: featureFlags.textParser.implementation });
    } else if (status === 401) {
      return Errors.unauthorized(message, { service: featureFlags.textParser.implementation });
    } else if (status === 403) {
      return Errors.forbidden(message, { service: featureFlags.textParser.implementation });
    } else if (status === 404) {
      return Errors.notFound(message, { service: featureFlags.textParser.implementation });
    } else {
      return Errors.internalServerError(message, { service: featureFlags.textParser.implementation });
    }
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
    const analyzeLogEntry = await createLogEntry('ANALYZE_PARSED_DATA', { 
      keyCount: Object.keys(parsedData).length 
    });
    await logToAuditTrail(analyzeLogEntry);
    
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
    const failureLogEntry = await createLogEntry('ANALYZE_PARSED_DATA_FAILURE', { 
      error: (error as Error).message
    });
    await logToAuditTrail(failureLogEntry);
    
    return Errors.internalServerError('Failed to analyze text', {
      service: featureFlags?.textParser?.implementation
    });
  }
});