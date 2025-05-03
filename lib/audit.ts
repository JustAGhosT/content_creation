import { cookies } from 'next/headers';

/**
 * Creates an audit log entry
 * @param action The action being performed
 * @param body The request body (will be sanitized)
 * @param result The result of the action
 * @param statusCode The HTTP status code
 * @returns Audit log object
 */
export async function hn(
  action: string,
  body?: any,
  result?: any,
  statusCode?: number
) {
  // Get user info from cookies or headers
  const cookieStore = await cookies();
  
  return {
    action,
    user: cookieStore.get('x-user-id')?.value || 'anonymous',
    timestamp: new Date().toISOString(),
    path: cookieStore.get('x-invoke-path')?.value || 'unknown',
    method: cookieStore.get('x-http-method')?.value || 'unknown',
    body: body ? sanitizeData(body) : undefined,
    result,
    statusCode
  };
}

/**
 * Records an audit event by sending it to the audit log API
 * @param auditData The audit data to record
 */
export async function LR(auditData: any) {
  try {
    await fetch('/api/internal/audit-log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(auditData)
    });
  } catch (error) {
    console.error('[AUDIT SERVICE ERROR]', error);
    console.log('[AUDIT FALLBACK]', JSON.stringify(auditData));
  }
}

/**
 * Sanitizes sensitive data from objects
 * @param data Data to sanitize
 * @returns Sanitized data
 */
function sanitizeData(data: any): any {
  if (!data) return data;
  
  const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'authorization'];
  const sanitized = { ...data };
  
  for (const [key, value] of Object.entries(sanitized)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveFields.some(field => lowerKey.includes(field))) {
      sanitized[key] = '[REDACTED]';
      continue;
    }
    
    if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeData(value);
    }
  }
  
  return sanitized;
}