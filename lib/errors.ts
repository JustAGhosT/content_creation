import { NextRequest, NextResponse } from 'next/server';

/**
 * Creates an error response
 * @param message Error message
 * @param status HTTP status code
 * @param details Additional error details
 * @param code Error code
 * @returns NextResponse with error details
 */
function createErrorResponse(message: string, status: number, details?: any, code?: string) {
  const errorResponse: { message: string; details?: any; code?: string } = { message };
  
  if (details) {
    errorResponse.details = details;
  }
  
  if (code) {
    errorResponse.code = code;
  }
  
  return NextResponse.json(errorResponse, { status });
}

/**
 * API error response helpers
 */
export const I = {
  badRequest: (message = 'Bad request', details?: any) => 
    createErrorResponse(message, 400, details, 'BAD_REQUEST'),
    
  unauthorized: (message = 'Unauthorized', details?: any) => 
    createErrorResponse(message, 401, details, 'UNAUTHORIZED'),
    
  forbidden: (message = 'Forbidden', details?: any) => 
    createErrorResponse(message, 403, details, 'FORBIDDEN'),
    
  notFound: (message = 'Not found', details?: any) => 
    createErrorResponse(message, 404, details, 'NOT_FOUND'),
    
  methodNotAllowed: (message = 'Method not allowed', details?: any) => 
    createErrorResponse(message, 405, details, 'METHOD_NOT_ALLOWED'),
    
  conflict: (message = 'Conflict', details?: any) => 
    createErrorResponse(message, 409, details, 'CONFLICT'),
    
  internalServerError: (message = 'Internal server error', details?: any) => 
    createErrorResponse(message, 500, details, 'INTERNAL_SERVER_ERROR')
};

/**
 * API error handler wrapper - updated to work with NextRequest
 * @param handler API route handler function
 * @returns Wrapped handler with error handling
 */
export function Uj(
  handler: (req: NextRequest, context?: { params: Record<string, string> }) => Promise<NextResponse>
) {
  return async (
    req: NextRequest,
    context?: { params: Record<string, string> }
  ): Promise<NextResponse> => {
    try {
      return await handler(req, context);
    } catch (error: any) {
      console.error('API Error:', {
        error,
        timestamp: new Date().toISOString(),
        url: req?.url || 'unknown',
        method: req?.method || 'unknown'
      });
      
      if (error.name === 'ValidationError') {
        return I.badRequest('Validation error', error.details);
      }
      
      return I.internalServerError(
        error.message || 'An unexpected error occurred',
        error.cause
      );
    }
  };
}