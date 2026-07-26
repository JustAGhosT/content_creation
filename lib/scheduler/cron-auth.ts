import crypto from 'node:crypto';

/**
 * Resolve the scheduler processor secret across local and Azure App Service
 * configuration conventions.
 */
export function getSchedulerCronSecret(): string | undefined {
  return (
    process.env.CRON_SECRET?.trim() || process.env.CUSTOMCONNSTR_CRON_SECRET?.trim() || undefined
  );
}

/**
 * Authenticate scheduler requests through a dedicated header, while retaining
 * Bearer compatibility for existing callers.
 */
export function isSchedulerCronRequestAuthorized(request: Request, cronSecret: string): boolean {
  const directSecret = request.headers.get('x-omnipost-cron-secret');
  const authorization = request.headers.get('authorization');
  const candidate =
    directSecret ?? (authorization?.startsWith('Bearer ') ? authorization.slice(7) : '');

  const expectedBuffer = Buffer.from(cronSecret);
  const candidateBuffer = Buffer.from(candidate);

  return (
    expectedBuffer.length === candidateBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, candidateBuffer)
  );
}
