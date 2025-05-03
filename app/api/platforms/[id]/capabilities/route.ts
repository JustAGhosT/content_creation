import { NextResponse } from 'next/server';
import { platforms, getPlatformConfig } from '../../../../../config/platforms';
import { withErrorHandling } from '../../../_utils/errors';
import { Errors } from '../../../_utils/errors';
import { isAuthenticated } from '../../../_utils/auth';
import { createLogEntry, logToAuditTrail } from '../../../_utils/audit';

const validateAuth = () => {
  if (!isAuthenticated()) {
    return Errors.unauthorized('Authentication required to access platform capabilities');
  }
  return null;
};

const validateAndParsePlatformId = (id: string | undefined) => {
  if (!id) {
    return { error: Errors.badRequest('Platform ID is required') };
  }
  
  const platformId = parseInt(id);
  if (isNaN(platformId)) {
    return { error: Errors.badRequest('Invalid platform ID') };
  }
  return { platformId, error: null };
};

const findPlatform = (platformId: number) => {
  const platform = platforms.find(p => p.id === platformId);
  if (!platform) {
    return { error: Errors.notFound('Platform not found') };
  }
  return { platform, error: null };
};

export const GET = withErrorHandling(async (
  request: Request,
  context?: { params?: Record<string, string> }
) => {
  const authError = validateAuth();
  if (authError) return authError;
  
  const id = context?.params?.id;
  const { platformId, error: idError } = validateAndParsePlatformId(id);
  if (idError) return idError;
  
  const { platform, error: platformError } = findPlatform(platformId);
  if (platformError) return platformError;
  
  // Log the access to platform capabilities
  const logEntry = await createLogEntry(
    'GET_PLATFORM_CAPABILITIES', 
    { platformId, platformName: platform.name }
  );
  await logToAuditTrail(logEntry);
  
  const config = getPlatformConfig(platform.name);
  
  if (!config) {
    return Errors.notFound('Platform configuration not found');
  }
  
  return NextResponse.json({
    platform,
    capabilities: config.capabilities || []
  });
});