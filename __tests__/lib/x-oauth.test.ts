import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals';
import {
  createPkcePair,
  decryptSecret,
  encryptSecret,
  isPlatformTokenEncryptionConfigured,
  safeEqual,
} from '../../lib/platforms/x/crypto';
import { openXOAuthFlow, sealXOAuthFlow } from '../../lib/platforms/x/flow';
import {
  createAuthorizationRequest,
  exchangeAuthorizationCode,
  fetchXIdentity,
  isXOAuthClientConfigured,
  refreshAccessToken,
  revokeXToken,
  X_OAUTH_SCOPES,
} from '../../lib/platforms/x/oauth';

const originalEnvironment = { ...process.env };
const fetchMock = jest.fn<typeof fetch>();

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe('X OAuth security primitives', () => {
  beforeEach(() => {
    process.env.PLATFORM_TOKEN_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
    process.env.X_CLIENT_ID = 'x-client-id';
    process.env.X_OAUTH_REDIRECT_URI = 'https://omnipost.example/api/platforms/x/callback';
    delete process.env.X_CLIENT_SECRET;
    global.fetch = fetchMock;
    fetchMock.mockReset();
  });

  afterEach(() => {
    process.env = { ...originalEnvironment };
    jest.restoreAllMocks();
  });

  test('encrypts secrets with authenticated purpose binding', () => {
    const encrypted = encryptSecret('access-token-value', 'x-access-token');

    expect(encrypted).not.toContain('access-token-value');
    expect(decryptSecret(encrypted, 'x-access-token')).toBe('access-token-value');
    expect(() => decryptSecret(encrypted, 'x-refresh-token')).toThrow();
  });

  test('creates an S256 PKCE pair and compares state safely', () => {
    const pair = createPkcePair();

    expect(pair.verifier.length).toBeGreaterThanOrEqual(43);
    expect(pair.challenge).not.toBe(pair.verifier);
    expect(safeEqual('matching-state', 'matching-state')).toBe(true);
    expect(safeEqual('matching-state', 'different-state')).toBe(false);
  });

  test('seals OAuth flow state and rejects expired state', () => {
    const payload = {
      state: 's'.repeat(43),
      verifier: 'v'.repeat(64),
      userId: 'user-1',
      expiresAt: Date.now() + 60_000,
    };
    const sealed = sealXOAuthFlow(payload);

    expect(openXOAuthFlow(sealed)).toEqual(payload);
    expect(openXOAuthFlow(sealXOAuthFlow({ ...payload, expiresAt: Date.now() - 1 }))).toBeNull();
  });

  test('constructs a least-privilege X authorization request', () => {
    const request = createAuthorizationRequest();
    const url = new URL(request.authorizationUrl);

    expect(url.origin).toBe('https://x.com');
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('client_id')).toBe('x-client-id');
    expect(url.searchParams.get('redirect_uri')).toBe(
      'https://omnipost.example/api/platforms/x/callback'
    );
    expect(url.searchParams.get('scope')).toBe(X_OAUTH_SCOPES.join(' '));
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('state')).toBe(request.state);
    expect(url.searchParams.get('code_challenge')).not.toBe(request.verifier);
    expect(isXOAuthClientConfigured()).toBe(true);
    expect(isPlatformTokenEncryptionConfigured()).toBe(true);
  });

  test('exchanges a code without exposing a public-client secret', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({
        token_type: 'bearer',
        expires_in: 7200,
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        scope: X_OAUTH_SCOPES.join(' '),
      })
    );

    const tokens = await exchangeAuthorizationCode('authorization-code', 'pkce-verifier');
    const [url, init] = fetchMock.mock.calls[0];
    const body = init?.body as URLSearchParams;

    expect(url).toBe('https://api.x.com/2/oauth2/token');
    expect(init?.headers).not.toHaveProperty('Authorization');
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('client_id')).toBe('x-client-id');
    expect(body.get('code_verifier')).toBe('pkce-verifier');
    expect(tokens.refresh_token).toBe('refresh-token');
  });

  test('refreshes, resolves identity, and revokes through user-context endpoints', async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({
          token_type: 'bearer',
          expires_in: 7200,
          access_token: 'rotated-access-token',
          refresh_token: 'rotated-refresh-token',
          scope: X_OAUTH_SCOPES.join(' '),
        })
      )
      .mockResolvedValueOnce(jsonResponse({ data: { id: 'x-123', username: 'omnipost' } }))
      .mockResolvedValueOnce(jsonResponse({ revoked: true }));

    const tokens = await refreshAccessToken('refresh-token');
    const identity = await fetchXIdentity(tokens.access_token);
    await revokeXToken(tokens.refresh_token || tokens.access_token);

    const refreshBody = fetchMock.mock.calls[0][1]?.body as URLSearchParams;
    expect(refreshBody.get('grant_type')).toBe('refresh_token');
    expect(refreshBody.get('refresh_token')).toBe('refresh-token');
    expect(fetchMock.mock.calls[1][1]?.headers).toEqual({
      Authorization: 'Bearer rotated-access-token',
    });
    expect(identity).toEqual({ id: 'x-123', username: 'omnipost' });
    expect(fetchMock.mock.calls[2][0]).toBe('https://api.x.com/2/oauth2/revoke');
  });

  test('fails closed when the encryption key is absent', () => {
    delete process.env.PLATFORM_TOKEN_ENCRYPTION_KEY;
    expect(() => encryptSecret('token', 'x-access-token')).toThrow(
      'PLATFORM_TOKEN_ENCRYPTION_KEY is not configured'
    );
  });

  test('rejects an insecure production callback URI', () => {
    process.env = { ...process.env, NODE_ENV: 'production' };
    process.env.X_OAUTH_REDIRECT_URI = 'http://omnipost.example/api/platforms/x/callback';

    expect(isXOAuthClientConfigured()).toBe(false);
    expect(() => createAuthorizationRequest()).toThrow(
      'X_OAUTH_REDIRECT_URI must use HTTPS in production'
    );
  });
});
