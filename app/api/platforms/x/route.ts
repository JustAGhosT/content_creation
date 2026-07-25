import { NextResponse } from 'next/server';
import { getCurrentUserId, isAuthenticated } from '@/app/api/_utils/auth';
import { Errors, withErrorHandling } from '@/app/api/_utils/errors';
import { RateLimitPresets, withRateLimit } from '@/app/api/_utils/rateLimit';
import { disconnectXAccount } from '@/lib/platforms/x/repository';

export const DELETE = withRateLimit(
  withErrorHandling(async () => {
    if (!(await isAuthenticated())) return Errors.unauthorized();
    const userId = await getCurrentUserId();
    if (!userId) return Errors.unauthorized();

    const disconnected = await disconnectXAccount(userId);
    return NextResponse.json({ disconnected });
  }),
  '/api/platforms/x',
  RateLimitPresets.AUTH,
  'X_OAUTH_DISCONNECT'
);
