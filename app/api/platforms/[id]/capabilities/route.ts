import { NextResponse } from 'next/server';
import { platforms, getPlatformConfig } from '../../../../../config/platforms';
import { withErrorHandling } from '../../../_utils/errors';
import { Errors } from '../../../_utils/errors';
import { isAuthenticated } from '../../../_utils/auth';
import { createLogEntry, logToAuditTrail } from '../../../_utils/audit';

export const GET = withErrorHandling(async (
  request: Request,
  { params }: { params: { id: string } }
) => {
  // Check authentication
  if (!isAuthenticated()) {
    return Errors.unauthorized('Authentication required to access platform capabilities');
  }
  
  const platformId = parseInt(params.id);
  
  if (isNaN(platformId)) {
    return Errors.badRequest('Invalid platform ID');
  }
  
  const platform = platforms.find(p => p.id === platformId);
  
  if (!platform) {
    return Errors.notFound('Platform not found');
  }
  
  // Log the access to platform capabilities
  await logToAuditTrail(createLogEntry(
    'GET_PLATFORM_CAPABILITIES', 
    { platformId, platformName: platform.name }
  ));
  
  const config = getPlatformConfig(platform.name);
  
  if (!config) {
    return Errors.notFound('Platform configuration not found');
  }
  
  return NextResponse.json({
    platform,
    capabilities: config.capabilities || []
  });
});