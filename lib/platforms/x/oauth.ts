import { z } from 'zod';
import { createPkcePair, randomOAuthState } from './crypto';

export const X_PLATFORM_ID = 'twitter';
export const X_OAUTH_SCOPES = [
  'tweet.read',
  'tweet.write',
  'users.read',
  'offline.access',
] as const;
export const X_OAUTH_FLOW_COOKIE = 'omnipost-x-oauth-flow';
export const X_OAUTH_FLOW_MAX_AGE_SECONDS = 10 * 60;
const X_OAUTH_REQUEST_TIMEOUT_MS = 15_000;

const tokenResponseSchema = z.object({
  token_type: z.string().min(1),
  expires_in: z.number().int().positive(),
  access_token: z.string().min(1),
  scope: z.string().min(1),
  refresh_token: z.string().min(1).optional(),
});

const userResponseSchema = z.object({
  data: z.object({
    id: z.string().min(1),
    username: z.string().min(1),
  }),
});

export type XTokenResponse = z.infer<typeof tokenResponseSchema>;

export class XOAuthTokenRequestError extends Error {
  constructor(
    readonly status: number,
    readonly oauthError?: string
  ) {
    super(`X OAuth token request failed with status ${status}`);
    this.name = 'XOAuthTokenRequestError';
  }
}

export function isDefinitiveXAuthorizationError(error: unknown): boolean {
  return (
    error instanceof XOAuthTokenRequestError &&
    (error.oauthError === 'invalid_grant' || error.oauthError === 'invalid_token')
  );
}

function requiredEnvironment(name: 'X_CLIENT_ID'): string {
  const value = (process.env[name] ?? process.env[`CUSTOMCONNSTR_${name}`])?.trim();
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}

export function getXOAuthConfig() {
  const clientId = requiredEnvironment('X_CLIENT_ID');
  const clientSecret = (
    process.env.X_CLIENT_SECRET ?? process.env.CUSTOMCONNSTR_X_CLIENT_SECRET
  )?.trim();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const redirectUri =
    process.env.X_OAUTH_REDIRECT_URI?.trim() ||
    (siteUrl ? `${siteUrl.replace(/\/$/, '')}/api/platforms/x/callback` : '');

  if (!redirectUri) {
    throw new Error('X_OAUTH_REDIRECT_URI or NEXT_PUBLIC_SITE_URL is not configured');
  }
  const parsedRedirectUri = new URL(redirectUri);
  if (parsedRedirectUri.pathname !== '/api/platforms/x/callback') {
    throw new Error('X_OAUTH_REDIRECT_URI must target /api/platforms/x/callback');
  }
  if (process.env.NODE_ENV === 'production' && parsedRedirectUri.protocol !== 'https:') {
    throw new Error('X_OAUTH_REDIRECT_URI must use HTTPS in production');
  }

  return {
    clientId,
    clientSecret,
    redirectUri: parsedRedirectUri.toString(),
    authorizeUrl: process.env.X_OAUTH_AUTHORIZE_URL || 'https://x.com/i/oauth2/authorize',
    tokenUrl: process.env.X_OAUTH_TOKEN_URL || 'https://api.x.com/2/oauth2/token',
    revokeUrl: process.env.X_OAUTH_REVOKE_URL || 'https://api.x.com/2/oauth2/revoke',
    meUrl: process.env.X_API_ME_URL || 'https://api.x.com/2/users/me',
  };
}

export function isXOAuthClientConfigured(): boolean {
  try {
    getXOAuthConfig();
    return true;
  } catch {
    return false;
  }
}

export function createAuthorizationRequest(): {
  authorizationUrl: string;
  state: string;
  verifier: string;
} {
  const config = getXOAuthConfig();
  const state = randomOAuthState();
  const { verifier, challenge } = createPkcePair();
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: X_OAUTH_SCOPES.join(' '),
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });

  return {
    authorizationUrl: `${config.authorizeUrl}?${params.toString()}`,
    state,
    verifier,
  };
}

function confidentialClientHeaders(clientId: string, clientSecret?: string): HeadersInit {
  if (!clientSecret) return {};
  return {
    Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`, 'utf8').toString('base64')}`,
  };
}

async function fetchWithOAuthTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), X_OAUTH_REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function parseTokenResponse(response: Response): Promise<XTokenResponse> {
  if (!response.ok) {
    const payload = (await response
      .clone()
      .json()
      .catch(() => null)) as { error?: unknown } | null;
    const oauthError = typeof payload?.error === 'string' ? payload.error : undefined;
    throw new XOAuthTokenRequestError(response.status, oauthError);
  }
  return tokenResponseSchema.parse(await response.json());
}

export async function exchangeAuthorizationCode(
  code: string,
  verifier: string
): Promise<XTokenResponse> {
  const config = getXOAuthConfig();
  const body = new URLSearchParams({
    code,
    grant_type: 'authorization_code',
    redirect_uri: config.redirectUri,
    code_verifier: verifier,
  });
  if (!config.clientSecret) body.set('client_id', config.clientId);

  const response = await fetchWithOAuthTimeout(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...confidentialClientHeaders(config.clientId, config.clientSecret),
    },
    body,
    cache: 'no-store',
  });
  return parseTokenResponse(response);
}

export async function refreshAccessToken(refreshToken: string): Promise<XTokenResponse> {
  const config = getXOAuthConfig();
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });
  if (!config.clientSecret) body.set('client_id', config.clientId);

  const response = await fetchWithOAuthTimeout(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...confidentialClientHeaders(config.clientId, config.clientSecret),
    },
    body,
    cache: 'no-store',
  });
  return parseTokenResponse(response);
}

export async function fetchXIdentity(accessToken: string): Promise<{
  id: string;
  username: string;
}> {
  const response = await fetch(getXOAuthConfig().meUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`X identity request failed with status ${response.status}`);
  }
  return userResponseSchema.parse(await response.json()).data;
}

export async function revokeXToken(token: string): Promise<void> {
  const config = getXOAuthConfig();
  const body = new URLSearchParams({ token });
  if (!config.clientSecret) body.set('client_id', config.clientId);

  const response = await fetch(config.revokeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...confidentialClientHeaders(config.clientId, config.clientSecret),
    },
    body,
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`X OAuth revoke request failed with status ${response.status}`);
  }
}
