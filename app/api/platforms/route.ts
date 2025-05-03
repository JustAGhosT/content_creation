import { NextResponse } from 'next/server';
import { platforms } from '../../../config/platforms';
import { withErrorHandling, Errors } from '../_utils/errors';
import { createLogEntry, logToAuditTrail } from '../_utils/audit';
import { isAuthenticated } from '../_utils/auth';

/**
 * Validates user authentication
 * @returns Error response if not authenticated, null otherwise
 */
function validateAuth() {
  if (!isAuthenticated()) {
    return Errors.unauthorized('Authentication required');
  }
  return null;
}

/**
 * Retrieves platforms data
 * @returns Array of platform objects
 */
async function getPlatformsData() {
  return platforms;
}

/**
 * Logs platform list access to audit trail
 */
async function logPlatformsAccess() {
  const logEntry = await createLogEntry('GET_PLATFORMS_LIST');
  await logToAuditTrail(logEntry);
}

/**
 * GET handler for platforms endpoint
 */
export const GET = withErrorHandling(async () => {
  // Check authentication
  const authError = validateAuth();
  if (authError) return authError;
  
  // Log the access to platforms list
  await logPlatformsAccess();
  
  // Return platforms list
  const platformsData = await getPlatformsData();
  return NextResponse.json(platformsData);
});