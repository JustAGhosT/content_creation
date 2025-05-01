import { NextResponse } from 'next/server';
import { platforms } from '../../../config/platforms';
import { withErrorHandling } from '../_utils/errors';
import { withAuditLogging, createLogEntry, logToAuditTrail } from '../_utils/audit';
import { isAuthenticated } from '../_utils/auth';

export const GET = withErrorHandling(async () => {
  // Check authentication
  if (!isAuthenticated()) {
    return new NextResponse(
      JSON.stringify({ message: 'Authentication required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  // Log the access to platforms list
  await logToAuditTrail(createLogEntry('GET_PLATFORMS_LIST'));
  
  // Return platforms list
  return NextResponse.json(platforms);
});