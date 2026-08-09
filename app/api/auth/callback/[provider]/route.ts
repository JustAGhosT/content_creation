/**
 * GET /api/auth/callback/[provider]
 *
 * Starts and completes external identity provider callbacks.
 */

import { createHash, randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createLogEntry, logToAuditTrail } from '../../../_utils/audit';
import { Errors, withErrorHandling } from '../../../_utils/errors';
import { withRateLimit, RateLimitPresets } from '../../../_utils/rateLimit';
import { authService } from '../../../../../lib/auth/auth-service';
import {
  ExternalIdentityEmailConflictError,
  resolveExternalUser,
} from '../../../../../lib/auth/external-user';
import {
  handleAuthCallback,
  initiateExternalAuth,
} from '../../../../../lib/auth/identity-provider';
import { prisma } from '../../../../../lib/db/prisma';
import { recordAnalyticsEvents } from '../../../../../lib/analytics/repository';

const OAUTH_STATE_COOKIE_PREFIX = 'oauth-state-';

interface StoredOAuthState {
  state: string;
  redirect: string;
  codeVerifier: string;
  campaignToken?: string;
}

function getPublicOrigin(request: Request, fallbackUrl: URL): string {
  const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const host = forwardedHost || request.headers.get('host') || fallbackUrl.host;
  const proto = forwardedProto || fallbackUrl.protocol.replace(':', '');
  return proto + '://' + host;
}

function parseSafeRedirect(value: string, origin: string): string {
  try {
    const redirectUrl = new URL(value, origin);
    if (redirectUrl.origin !== origin) {
      return '/dashboard';
    }
    return `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`;
  } catch {
    return '/dashboard';
  }
}

function parseStoredOAuthState(value: string | undefined): StoredOAuthState | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<StoredOAuthState>;
    if (
      typeof parsed.state !== 'string' ||
      typeof parsed.redirect !== 'string' ||
      typeof parsed.codeVerifier !== 'string'
    ) {
      return null;
    }
    return {
      state: parsed.state,
      redirect: parsed.redirect,
      codeVerifier: parsed.codeVerifier,
      campaignToken:
        typeof parsed.campaignToken === 'string' && /^mtk_[a-z0-9_]+$/.test(parsed.campaignToken)
          ? parsed.campaignToken
          : undefined,
    };
  } catch {
    return null;
  }
}

function createCodeChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

async function handleCallback(
  request: Request,
  context?: { params: Promise<{ provider: string }> }
): Promise<NextResponse> {
  if (!context) {
    return Errors.badRequest('Missing route context');
  }

  const { provider } = await context.params;
  if (!provider || provider.length > 50) {
    return Errors.badRequest('Invalid provider');
  }

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const publicOrigin = getPublicOrigin(request, url);
  const callbackUrl = new URL(url.pathname, publicOrigin).toString();
  const cookieStore = await cookies();
  const stateCookieName = `${OAUTH_STATE_COOKIE_PREFIX}${provider}`;

  if (!code) {
    const state = randomBytes(24).toString('base64url');
    const codeVerifier = randomBytes(32).toString('base64url');
    const codeChallenge = createCodeChallenge(codeVerifier);
    const requestedRedirect = url.searchParams.get('redirect') || '/dashboard';
    const requestedCampaignToken = url.searchParams.get('campaign_token');
    const campaignToken =
      requestedCampaignToken && /^mtk_[a-z0-9_]+$/.test(requestedCampaignToken)
        ? requestedCampaignToken
        : undefined;
    const redirect = await initiateExternalAuth(provider, callbackUrl, state, codeChallenge);

    if (!redirect) {
      const loginUrl = new URL('/login', publicOrigin);
      loginUrl.searchParams.set('error', 'Mystira Identity sign-in is unavailable');
      return NextResponse.redirect(loginUrl);
    }

    cookieStore.set({
      name: stateCookieName,
      value: JSON.stringify({
        state,
        redirect: parseSafeRedirect(requestedRedirect, publicOrigin),
        codeVerifier,
        campaignToken,
      }),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60,
      path: '/',
    });

    return NextResponse.redirect(redirect.redirectUrl);
  }

  const storedState = parseStoredOAuthState(cookieStore.get(stateCookieName)?.value);
  cookieStore.delete(stateCookieName);
  if (!storedState || storedState.state !== url.searchParams.get('state')) {
    return Errors.badRequest('Invalid OAuth state');
  }

  const authResult = await handleAuthCallback(
    provider,
    code,
    callbackUrl,
    storedState.codeVerifier
  );

  if (!authResult.success || !authResult.user) {
    await logToAuditTrail(
      await createLogEntry('EXTERNAL_LOGIN_FAILED', {
        provider,
        reason: authResult.error ?? 'Unknown error',
      })
    );
    const loginUrl = new URL('/login', publicOrigin);
    loginUrl.searchParams.set('error', authResult.error ?? 'Authentication failed');
    return NextResponse.redirect(loginUrl);
  }

  const { externalId, email, name } = authResult.user;
  if (!prisma) {
    return Errors.internalServerError('Database is not available');
  }

  let localUser;
  try {
    localUser = await resolveExternalUser(prisma, { provider, externalId, email, name });
  } catch (error) {
    if (error instanceof ExternalIdentityEmailConflictError) {
      const loginUrl = new URL('/login', publicOrigin);
      loginUrl.searchParams.set('error', error.message);
      return NextResponse.redirect(loginUrl);
    }
    throw error;
  }

  const { id: userId, username, role, isNew: isNewUser } = localUser;

  const token = authService.generateToken({ id: userId, username, role });

  if (isNewUser) {
    const timestamp = new Date().toISOString();
    const method = provider === 'google' || provider === 'github' ? provider : 'mystira';
    try {
      await recordAnalyticsEvents(
        [
          {
            eventId: `server:signup_started:${provider}:${userId}`,
            name: 'signup_started',
            properties: { timestamp, method, campaignToken: storedState.campaignToken },
          },
          {
            eventId: `server:signup_completed:${provider}:${userId}`,
            name: 'signup_completed',
            properties: { timestamp, method, campaignToken: storedState.campaignToken },
          },
        ],
        userId,
        prisma
      );
    } catch (error) {
      console.error('[Auth] Failed to record external signup analytics:', error);
    }
  }

  cookieStore.set({
    name: 'auth-token',
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60,
    path: '/',
  });

  await logToAuditTrail(
    await createLogEntry('EXTERNAL_LOGIN_SUCCESS', {
      provider,
      userId,
      username,
      isNewUser,
    })
  );

  return NextResponse.redirect(new URL(storedState.redirect, publicOrigin));
}

export const GET = withRateLimit(
  withErrorHandling(async (req: Request) => {
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/');
    const providerFromPath = pathSegments[pathSegments.length - 1];
    return handleCallback(req, {
      params: Promise.resolve({ provider: providerFromPath }),
    });
  }),
  '/api/auth/callback',
  RateLimitPresets.OAUTH_CALLBACK,
  'OAUTH_CALLBACK'
);
