import { NextResponse } from 'next/server';
import { getCurrentUserId, isAuthenticated } from '@/app/api/_utils/auth';
import { Errors, withErrorHandling } from '@/app/api/_utils/errors';
import { RateLimitPresets, withRateLimit } from '@/app/api/_utils/rateLimit';
import { isPlatformTokenEncryptionConfigured } from '@/lib/platforms/x/crypto';
import { isXOAuthClientConfigured } from '@/lib/platforms/x/oauth';
import { getXConnectionStatus } from '@/lib/platforms/x/repository';

export const GET = withRateLimit(
  withErrorHandling(async () => {
    if (!(await isAuthenticated())) return Errors.unauthorized();
    const userId = await getCurrentUserId();
    if (!userId) return Errors.unauthorized();

    const x = {
      ...(await getXConnectionStatus(userId)),
      configured: isXOAuthClientConfigured() && isPlatformTokenEncryptionConfigured(),
    };
    return NextResponse.json(
      { connections: { twitter: x } },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  }),
  '/api/platforms/connections',
  RateLimitPresets.GENERAL
);
