import { z } from 'zod';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { withErrorHandling } from '@/app/api/_utils/errors';
import { RateLimitPresets, withRateLimit } from '@/app/api/_utils/rateLimit';
import { safeEqual } from '@/lib/platforms/x/crypto';
import { openXOAuthFlow } from '@/lib/platforms/x/flow';
import {
  exchangeAuthorizationCode,
  fetchXIdentity,
  getXOAuthConfig,
  revokeXToken,
  type XTokenResponse,
  X_OAUTH_FLOW_COOKIE,
} from '@/lib/platforms/x/oauth';
import { saveXAccount } from '@/lib/platforms/x/repository';

const callbackSchema = z.object({
  code: z.string().min(1),
  state: z.string().min(32).max(500),
});

function settingsRedirect(outcome: 'success' | 'denied' | 'invalid' | 'failed') {
  const publicOrigin = new URL(getXOAuthConfig().redirectUri).origin;
  const url = new URL('/settings/platforms', publicOrigin);
  url.searchParams.set('xConnection', outcome);
  return NextResponse.redirect(url);
}

async function readFlowCookie() {
  const cookie = (await cookies()).get(X_OAUTH_FLOW_COOKIE)?.value;
  return cookie ? openXOAuthFlow(cookie) : null;
}

function clearFlowCookie(response: NextResponse): NextResponse {
  response.cookies.set(X_OAUTH_FLOW_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/api/platforms/x/callback',
  });
  return response;
}

export const GET = withRateLimit(
  withErrorHandling(async (request: Request) => {
    const url = new URL(request.url);
    const flow = await readFlowCookie();
    const returnedState = url.searchParams.get('state');
    const stateIsValid = Boolean(
      flow &&
      returnedState &&
      returnedState.length >= 32 &&
      returnedState.length <= 500 &&
      safeEqual(flow.state, returnedState)
    );

    if (url.searchParams.has('error')) {
      return clearFlowCookie(settingsRedirect(stateIsValid ? 'denied' : 'invalid'));
    }

    const parsed = callbackSchema.safeParse({
      code: url.searchParams.get('code'),
      state: returnedState,
    });
    if (!parsed.success || !flow || !stateIsValid) {
      return clearFlowCookie(settingsRedirect('invalid'));
    }

    let issuedTokens: XTokenResponse | null = null;
    try {
      issuedTokens = await exchangeAuthorizationCode(parsed.data.code, flow.verifier);
      const tokens = issuedTokens;
      const identity = await fetchXIdentity(tokens.access_token);
      await saveXAccount(flow.userId, identity, tokens);
      issuedTokens = null;
      return clearFlowCookie(settingsRedirect('success'));
    } catch (error) {
      if (issuedTokens) {
        try {
          await revokeXToken(issuedTokens.refresh_token ?? issuedTokens.access_token);
        } catch (cleanupError) {
          console.error('[X OAuth] Callback token cleanup failed', {
            error: cleanupError instanceof Error ? cleanupError.message : 'Unknown error',
          });
        }
      }
      console.error('[X OAuth] Callback failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return clearFlowCookie(settingsRedirect('failed'));
    }
  }),
  '/api/platforms/x/callback',
  RateLimitPresets.OAUTH_CALLBACK,
  'OAUTH_CALLBACK'
);
