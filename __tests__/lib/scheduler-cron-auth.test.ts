import { afterEach, describe, expect, jest, test } from '@jest/globals';
import {
  getSchedulerCronAuthDiagnostics,
  getSchedulerCronSecret,
  isSchedulerCronRequestAuthorized,
} from '../../lib/scheduler/cron-auth';

describe('scheduler cron authentication configuration', () => {
  const originalCronSecret = process.env.CRON_SECRET;
  const originalCustomConnectionString = process.env.CUSTOMCONNSTR_CRON_SECRET;
  const originalIdentityEndpoint = process.env.IDENTITY_ENDPOINT;
  const originalIdentityHeader = process.env.IDENTITY_HEADER;
  const originalSecretUri = process.env.SCHEDULER_CRON_SECRET_URI;
  const originalFetch = global.fetch;

  afterEach(() => {
    jest.restoreAllMocks();

    if (originalCronSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalCronSecret;

    if (originalCustomConnectionString === undefined) {
      delete process.env.CUSTOMCONNSTR_CRON_SECRET;
    } else {
      process.env.CUSTOMCONNSTR_CRON_SECRET = originalCustomConnectionString;
    }

    if (originalIdentityEndpoint === undefined) delete process.env.IDENTITY_ENDPOINT;
    else process.env.IDENTITY_ENDPOINT = originalIdentityEndpoint;

    if (originalIdentityHeader === undefined) delete process.env.IDENTITY_HEADER;
    else process.env.IDENTITY_HEADER = originalIdentityHeader;

    if (originalSecretUri === undefined) delete process.env.SCHEDULER_CRON_SECRET_URI;
    else process.env.SCHEDULER_CRON_SECRET_URI = originalSecretUri;

    if (originalFetch === undefined) delete (global as { fetch?: typeof fetch }).fetch;
    else global.fetch = originalFetch;
  });

  test('prefers the standard environment variable', async () => {
    process.env.CRON_SECRET = ' direct-secret ';
    process.env.CUSTOMCONNSTR_CRON_SECRET = 'connection-string-secret';

    await expect(getSchedulerCronSecret()).resolves.toBe('direct-secret');
  });

  test('uses the Azure custom connection string convention', async () => {
    delete process.env.CRON_SECRET;
    process.env.CUSTOMCONNSTR_CRON_SECRET = ' azure-secret ';

    await expect(getSchedulerCronSecret()).resolves.toBe('azure-secret');
  });

  test('falls back when the standard variable is blank', async () => {
    process.env.CRON_SECRET = '   ';
    process.env.CUSTOMCONNSTR_CRON_SECRET = 'azure-secret';

    await expect(getSchedulerCronSecret()).resolves.toBe('azure-secret');
  });

  test('treats blank values as missing', async () => {
    process.env.CRON_SECRET = '   ';
    process.env.CUSTOMCONNSTR_CRON_SECRET = '   ';

    await expect(getSchedulerCronSecret()).resolves.toBeUndefined();
  });

  test('uses managed identity to resolve the current Key Vault value', async () => {
    process.env.CRON_SECRET = 'stale-environment-secret';
    process.env.IDENTITY_ENDPOINT = 'http://127.0.0.1:41741/msi/token';
    process.env.IDENTITY_HEADER = 'identity-header';
    process.env.SCHEDULER_CRON_SECRET_URI =
      'https://example.vault.azure.net/secrets/scheduler-secret';

    const fetchMock = jest
      .fn<typeof fetch>()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'managed-identity-token' }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ value: ' current-key-vault-secret ' }),
      } as Response);
    global.fetch = fetchMock;

    await expect(getSchedulerCronSecret()).resolves.toBe('current-key-vault-secret');
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        hostname: '127.0.0.1',
        searchParams: expect.any(URLSearchParams),
      }),
      {
        headers: { 'X-IDENTITY-HEADER': 'identity-header' },
        signal: expect.any(AbortSignal),
      }
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ hostname: 'example.vault.azure.net' }),
      {
        headers: { Authorization: 'Bearer managed-identity-token' },
        signal: expect.any(AbortSignal),
      }
    );
  });
});

describe('scheduler cron request authentication', () => {
  it('accepts the dedicated scheduler header', () => {
    const request = new Request('https://example.test', {
      headers: { 'X-OmniPost-Cron-Secret': 'scheduler-secret' },
    });

    expect(isSchedulerCronRequestAuthorized(request, 'scheduler-secret')).toBe(true);
  });

  it('retains Bearer compatibility', () => {
    const request = new Request('https://example.test', {
      headers: { Authorization: 'Bearer scheduler-secret' },
    });

    expect(isSchedulerCronRequestAuthorized(request, 'scheduler-secret')).toBe(true);
  });

  it.each([
    ['missing headers', {}],
    ['malformed Bearer header', { Authorization: 'scheduler-secret' }],
    ['wrong dedicated secret', { 'X-OmniPost-Cron-Secret': 'wrong-secret' }],
  ])('rejects %s', (_label, headers) => {
    const request = new Request('https://example.test', { headers });

    expect(isSchedulerCronRequestAuthorized(request, 'scheduler-secret')).toBe(false);
  });

  it('reports only presence and byte lengths for rejected requests', () => {
    const request = new Request('https://example.test', {
      headers: { 'X-OmniPost-Cron-Secret': 'wrong-secret' },
    });

    expect(getSchedulerCronAuthDiagnostics(request, 'scheduler-secret')).toEqual({
      expectedBytes: 16,
      directHeaderPresent: true,
      directHeaderBytes: 12,
      authorizationHeaderPresent: false,
      authorizationHeaderBytes: 0,
    });
  });
});
