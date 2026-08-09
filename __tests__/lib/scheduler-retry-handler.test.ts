import { PlatformHttpError } from '@/lib/scheduler/adapters';
import { RetryHandler } from '@/lib/scheduler/retry-handler';

describe('scheduler retry classification', () => {
  const handler = new RetryHandler();

  test('treats provider HTTP 402 as operator-actionable and non-retryable', () => {
    expect(handler.classifyError(new PlatformHttpError('X', 402, 'Payment Required'))).toEqual({
      retryable: false,
      code: 'PAYMENT_REQUIRED',
      message: 'Provider credits or billing required (402): Payment Required',
    });
  });

  test('retains retries for rate limits and provider server errors', () => {
    expect(handler.classifyError(new PlatformHttpError('X', 429))).toMatchObject({
      retryable: true,
      code: 'RATE_LIMITED',
    });
    expect(handler.classifyError(new PlatformHttpError('X', 503))).toMatchObject({
      retryable: true,
      code: 'SERVER_ERROR',
    });
  });

  test('preserves a publisher classification passed to the scheduler', () => {
    expect(
      handler.classifyError({
        code: 'PAYMENT_REQUIRED',
        retryable: false,
        message: 'X API error: 402',
      })
    ).toEqual({
      retryable: false,
      code: 'PAYMENT_REQUIRED',
      message: 'X API error: 402',
    });
  });

  test('does not mislabel ordinary errors as unknown HTTP errors', () => {
    expect(handler.classifyError(new Error('Unexpected adapter failure'))).toEqual({
      retryable: true,
      code: 'UNKNOWN',
      message: 'Unexpected adapter failure',
    });
  });
});
