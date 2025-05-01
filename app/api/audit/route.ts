import { NextResponse } from 'next/server';
import { withErrorHandling, Errors } from '../_utils/errors';
import { isAdmin } from '../_utils/auth';
import { createLogEntry, logToAuditTrail } from '../_utils/audit';
import fs from 'fs';
import path from 'path';

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

// Get log file path from environment variable or use default
const logFilePath: string = path.join(
  process.cwd(),
  process.env.AUDIT_LOG_PATH || 'logs/audit-log.json'
);

// Get audit logs endpoint
export const GET = withErrorHandling(async (request: Request) => {
  // Check if user is admin
  if (!isAdmin()) {
    return Errors.forbidden('Admin privileges required to access audit logs');
  }
  
  try {
    // Get query parameters for filtering and pagination
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const page = parseInt(url.searchParams.get('page') || '1');
    const action = url.searchParams.get('action');
    const user = url.searchParams.get('user');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    
    // Log the audit logs access
    await logToAuditTrail(createLogEntry('ACCESS_AUDIT_LOGS', { 
      limit, page, action, user, startDate, endDate 
    }));
    
    // Check if log file exists
    if (!fs.existsSync(logFilePath)) {
      return NextResponse.json({ logs: [], total: 0, page, limit });
    }
    
    // Read and parse log file
    const data = await fs.promises.readFile(logFilePath, 'utf-8');
    let logs: LogEntry[] = JSON.parse(data);
    
    // Apply filters
    if (action) {
      logs = logs.filter(log => log.action === action);
    }
    
    if (user) {
      logs = logs.filter(log => log.user === user);
    }
    
    if (startDate) {
      const start = new Date(startDate).getTime();
      logs = logs.filter(log => new Date(log.timestamp).getTime() >= start);
    }
    
    if (endDate) {
      const end = new Date(endDate).getTime();
      logs = logs.filter(log => new Date(log.timestamp).getTime() <= end);
    }
    
    // Get total count before pagination
    const total = logs.length;
    
    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    logs = logs.slice(startIndex, endIndex);
    
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
    
    // Log audit logs access failure
    await logToAuditTrail(createLogEntry('ACCESS_AUDIT_LOGS_FAILURE', { 
      error: (error as Error).message
    }));
    
    return Errors.internalServerError('Failed to retrieve audit logs');
  }
});