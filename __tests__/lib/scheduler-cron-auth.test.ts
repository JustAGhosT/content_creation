import { afterEach, describe, expect, test } from '@jest/globals';
import {
  getSchedulerCronAuthDiagnostics,
  getSchedulerCronSecret,
  isSchedulerCronRequestAuthorized,
} from '../../lib/scheduler/cron-auth';

describe('scheduler cron authentication configuration', () => {
  const originalCronSecret = process.env.CRON_SECRET;
  const originalCustomConnectionString = process.env.CUSTOMCONNSTR_CRON_SECRET;

  afterEach(() => {
    if (originalCronSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalCronSecret;

    if (originalCustomConnectionString === undefined) {
      delete process.env.CUSTOMCONNSTR_CRON_SECRET;
    } else {
      process.env.CUSTOMCONNSTR_CRON_SECRET = originalCustomConnectionString;
    }
  });

  test('prefers the standard environment variable', () => {
    process.env.CRON_SECRET = ' direct-secret ';
    process.env.CUSTOMCONNSTR_CRON_SECRET = 'connection-string-secret';

    expect(getSchedulerCronSecret()).toBe('direct-secret');
  });

  test('uses the Azure custom connection string convention', () => {
    delete process.env.CRON_SECRET;
    process.env.CUSTOMCONNSTR_CRON_SECRET = ' azure-secret ';

    expect(getSchedulerCronSecret()).toBe('azure-secret');
  });

  test('falls back when the standard variable is blank', () => {
    process.env.CRON_SECRET = '   ';
    process.env.CUSTOMCONNSTR_CRON_SECRET = 'azure-secret';

    expect(getSchedulerCronSecret()).toBe('azure-secret');
  });

  test('treats blank values as missing', () => {
    process.env.CRON_SECRET = '   ';
    process.env.CUSTOMCONNSTR_CRON_SECRET = '   ';

    expect(getSchedulerCronSecret()).toBeUndefined();
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
