import { NextResponse } from 'next/server';
import { getCurrentUserId, isAuthenticated } from '@/app/api/_utils/auth';
import { Errors, withErrorHandling } from '@/app/api/_utils/errors';
import { RateLimitPresets, withRateLimit } from '@/app/api/_utils/rateLimit';
import { sealXOAuthFlow } from '@/lib/platforms/x/flow';
import {
  createAuthorizationRequest,
  X_OAUTH_FLOW_COOKIE,
  X_OAUTH_FLOW_MAX_AGE_SECONDS,
} from '@/lib/platforms/x/oauth';

export const POST = withRateLimit(
  withErrorHandling(async () => {
    if (!(await isAuthenticated())) return Errors.unauthorized();
    const userId = await getCurrentUserId();
    if (!userId) return Errors.unauthorized();

    const request = createAuthorizationRequest();
    const response = NextResponse.json({ authorizationUrl: request.authorizationUrl });
    response.cookies.set(
      X_OAUTH_FLOW_COOKIE,
      sealXOAuthFlow({
        state: request.state,
        verifier: request.verifier,
        userId,
        expiresAt: Date.now() + X_OAUTH_FLOW_MAX_AGE_SECONDS * 1000,
      }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: X_OAUTH_FLOW_MAX_AGE_SECONDS,
        path: '/api/platforms/x/callback',
      }
    );
    return response;
  }),
  '/api/platforms/x/connect',
  RateLimitPresets.AUTH,
  'AUTH'
);
