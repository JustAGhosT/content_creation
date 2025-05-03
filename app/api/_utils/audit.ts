import { headers } from 'next/headers';

/**
 * Log entry structure for API audit trail
 */
export interface LogEntry {
  action: string;
  user: string;
  timestamp: string;
  path: string;
  method: string;
  body?: any;
  result?: string;
  statusCode?: number;
}

/**
 * Sanitizes sensitive data from request body
 * @param body The request body to sanitize
 * @returns Sanitized body object
 */
export function sanitizeRequestBody(body: any): any {
  if (!body) return body;
  
  const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'authorization'];
  const sanitized = { ...body };
  
  // Recursively sanitize nested objects
  for (const [key, value] of Object.entries(sanitized)) {
    const lowerKey = key.toLowerCase();
    
    if (sensitiveFields.some(field => lowerKey.includes(field))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeRequestBody(value);
    }
  }
  
  return sanitized;
}

/**
 * Creates an audit log entry
 * @param action The action being performed
 * @param body The request body (will be sanitized)
 * @param result The result of the action
 * @param statusCode The HTTP status code
 * @returns Log entry object
 */
export function createLogEntry(
  action: string,
  body?: any,
  result?: string,
  statusCode?: number
): LogEntry {
  const headersList = headers();
  const path = headersList.get('x-invoke-path') || 'unknown';
  const method = headersList.get('x-http-method') || 'unknown';
  const user = headersList.get('x-user-id') || 'anonymous';
  
  return {
    action,
    user,
    timestamp: new Date().toISOString(),
    path,
    method,
    body: body ? sanitizeRequestBody(body) : undefined,
    result,
    statusCode
  };
}

/**
 * Logs an API action to the audit trail
 * @param entry The log entry to record
 */
export async function logToAuditTrail(entry: LogEntry): Promise<void> {
  // In a production environment, you would:
  // 1. Store this in a database
  // 2. Send to a logging service
  // 3. Write to a secure audit log file
  
  // For now, we'll just console.log it
  console.log('[AUDIT]', JSON.stringify(entry));
}

/**
 * Middleware-style function to add audit logging to a route handler
 * @param action The action name to log
 * @param handler The route handler function
 * @returns A function that logs the action before calling the handler
 */
export function withAuditLogging<T>(
  action: string,
  handler: (body?: any) => Promise<T>
): (body?: any) => Promise<T> {
  return async (body?: any) => {
    // Log the start of the action
    const entry = createLogEntry(action, body);
    await logToAuditTrail(entry);
    
    // Execute the handler
    const result = await handler(body);
    
    // Log the completion of the action
    const completionEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
      result: result ? 'success' : 'failure',
      statusCode: (result as any)?.status || 200
    };
    await logToAuditTrail(completionEntry);
    
    return result;
  };
}