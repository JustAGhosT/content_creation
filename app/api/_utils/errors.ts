import { NextResponse } from 'next/server';

/**
 * Standard error response structure
 */
export interface ErrorResponse {
  message: string;
  details?: any;
  code?: string;
}

/**
 * Creates a standardized error response
 * @param message Error message
 * @param status HTTP status code
 * @param details Additional error details (optional)
 * @param code Error code (optional)
 * @returns NextResponse with error details
 */
export function createErrorResponse(
  message: string,
  status: number = 500,
  details?: any,
  code?: string
): NextResponse {
  const errorBody: ErrorResponse = {
    message
  };
  
  if (details) errorBody.details = details;
  if (code) errorBody.code = code;
  
  return NextResponse.json(errorBody, { status });
}

/**
 * Common error responses
 */
export const Errors = {
  badRequest: (message: string = 'Bad request', details?: any) => 
    createErrorResponse(message, 400, details, 'BAD_REQUEST'),
    
  unauthorized: (message: string = 'Unauthorized', details?: any) => 
    createErrorResponse(message, 401, details, 'UNAUTHORIZED'),
    
  forbidden: (message: string = 'Forbidden', details?: any) => 
    createErrorResponse(message, 403, details, 'FORBIDDEN'),
    
  notFound: (message: string = 'Not found', details?: any) => 
    createErrorResponse(message, 404, details, 'NOT_FOUND'),
    
  methodNotAllowed: (message: string = 'Method not allowed', details?: any) => 
    createErrorResponse(message, 405, details, 'METHOD_NOT_ALLOWED'),
    
  conflict: (message: string = 'Conflict', details?: any) => 
    createErrorResponse(message, 409, details, 'CONFLICT'),
    
  internalServerError: (message: string = 'Internal server error', details?: any) => 
    createErrorResponse(message, 500, details, 'INTERNAL_SERVER_ERROR'),
};

/**
 * Wraps a route handler with try/catch for standardized error handling
 * @param handler The route handler function
 * @returns A function that handles errors consistently
 */
export function withErrorHandling(
  handler: (...args: any[]) => Promise<NextResponse>
): (...args: any[]) => Promise<NextResponse> {
  return async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (error: any) {
      console.error('API Error:', error);
      
      // Handle specific known errors
      if (error.name === 'ValidationError') {
        return Errors.badRequest('Validation error', error.details);
      }
      
      // Default to internal server error
      return Errors.internalServerError(
        error.message || 'An unexpected error occurred'
      );
    }
  };
}