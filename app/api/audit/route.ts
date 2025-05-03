import { NextResponse } from 'next/server';
import { withErrorHandling, Errors } from '../_utils/errors';
import { isAdmin } from '../_utils/auth';
import { createLogEntry, logToAuditTrail, sanitizeRequestBody } from '../_utils/audit';
import fs from 'fs';
import path from 'path';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

// Define the log entry interface
interface LogEntry {
  action: string;
  user: string;
  timestamp: string;
  path: string;
  method: string;
  body?: any;
  result?: string;
  statusCode?: number;
}

// Maximum number of logs to return in a single request
const MAX_LIMIT = 500;
// Default number of logs per page
const DEFAULT_LIMIT = 100;
// Maximum file size to read at once (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;
// Get log file path from environment variable or use default
const logFilePath: string = path.join(
  process.cwd(),
  process.env.AUDIT_LOG_PATH || 'logs/audit-log.json'
);

/**
 * Sanitizes error messages to remove sensitive information
 * @param errorMsg The error message to sanitize
 * @returns Sanitized error message
 */
function sanitizeErrorMessage(errorMsg: string): string {
  // List of patterns to redact
  const sensitivePatterns = [
    /password=\S+/gi,
    /token=\S+/gi,
    /apikey=\S+/gi,
    /secret=\S+/gi,
    /authorization=\S+/gi,
    // Redact potential stack traces
    /at\s+.*\(.*\)/gi,
    // Redact file paths
    /\/[\w\/\.-]+/gi
  ];
  
  let sanitized = errorMsg;
  sensitivePatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  });
  
  return sanitized;
}
// Get audit logs endpoint
export const GET = withErrorHandling(async (request: Request) => {
  // Check if user is admin
  if (!(await isAdmin())) {
    return Errors.forbidden('Admin privileges required to access audit logs');
  }
  
  try {
    // Get query parameters for filtering and pagination
    const url = new URL(request.url);
    
    // Validate and sanitize limit parameter
    const limitRaw = Number(url.searchParams.get('limit')) || DEFAULT_LIMIT;
    const limit = Math.min(Math.max(limitRaw, 1), MAX_LIMIT); // Between 1 and MAX_LIMIT
    
    // Validate and sanitize page parameter
    const page = Math.max(Number(url.searchParams.get('page')) || 1, 1); // At least 1
    const action = url.searchParams.get('action');
    const user = url.searchParams.get('user');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    
    // Log the audit logs access
    await logToAuditTrail(await createLogEntry('ACCESS_AUDIT_LOGS', { 
      limit, page, action, user, startDate, endDate 
    }));
    
    // Check if log file exists
    if (!fs.existsSync(logFilePath)) {
      return NextResponse.json({ logs: [], total: 0, page, limit });
    }
    
    // Check file size before reading
    const stats = await fs.promises.stat(logFilePath);
    if (stats.size > MAX_FILE_SIZE) {
      return Errors.internalServerError('Audit log file is too large to process');
    }
    
    // Process logs in a streaming manner for large files
    let logs: LogEntry[] = [];
    let totalLogs = 0;
    
    // For smaller files, we can use the direct approach
    const data = await fs.promises.readFile(logFilePath, 'utf-8');
    const allLogs: LogEntry[] = JSON.parse(data);
    // Apply filters
    let filteredLogs = allLogs;
    if (action) {
      filteredLogs = filteredLogs.filter(log => log.action === action);
    }
    
    if (user) {
      filteredLogs = filteredLogs.filter(log => log.user === user);
    }
    
    if (startDate) {
      const start = new Date(startDate).getTime();
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp).getTime() >= start);
    }
    
    if (endDate) {
      const end = new Date(endDate).getTime();
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp).getTime() <= end);
    }
    
    // Get total count before pagination
    const total = filteredLogs.length;
    
    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    logs = filteredLogs.slice(startIndex, endIndex);
    
    // Return paginated and filtered logs
    return NextResponse.json({
      logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Error retrieving audit logs:', error);
    
    // Sanitize error message before logging
    const sanitizedError = sanitizeErrorMessage((error as Error).message);
    // Log audit logs access failure
    await logToAuditTrail(await createLogEntry('ACCESS_AUDIT_LOGS_FAILURE', { 
      error: sanitizedError
    }));
    
    return Errors.internalServerError('Failed to retrieve audit logs');
  }
});