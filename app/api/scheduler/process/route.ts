/**
 * Scheduler Process Route
 * POST - Trigger processing of due jobs (for cron/manual trigger)
 * GET - Health check for the process endpoint
 */

import { NextResponse } from 'next/server';
import { getScheduler } from '@/lib/scheduler';
import {
  getSchedulerCronAuthDiagnostics,
  getSchedulerCronSecret,
  isSchedulerCronRequestAuthorized,
} from '@/lib/scheduler/cron-auth';
import { Errors, withErrorHandling } from '@/app/api/_utils/errors';
import { withRateLimit, RateLimitPresets } from '@/app/api/_utils/rateLimit';

/**
 * POST /api/scheduler/process
 * Process due jobs
 *
 * This endpoint is designed to be called by:
 * - Vercel Cron (every minute)
 * - Manual trigger for testing
 * - External scheduler service
 *
 * Authenticated via CRON_SECRET bearer token (not user auth).
 */
export const POST = withRateLimit(
  withErrorHandling(async (request: Request) => {
    // Verify cron secret - mandatory in production
    const cronSecret = getSchedulerCronSecret();

    // In production, CRON_SECRET must be configured
    if (process.env.NODE_ENV === 'production' && !cronSecret) {
      console.error('[Scheduler] CRON_SECRET not configured in production');
      return Errors.internalServerError('Server misconfiguration: CRON_SECRET required');
    }

    // Validate authorization with constant-time comparison
    if (cronSecret) {
      if (!isSchedulerCronRequestAuthorized(request, cronSecret)) {
        console.warn(
          '[Scheduler] Cron authentication rejected:',
          getSchedulerCronAuthDiagnostics(request, cronSecret)
        );
        return Errors.unauthorized('Unauthorized');
      }
    }

    const scheduler = getScheduler();
    const results = await scheduler.processDueJobs();

    const summary = {
      processed: results.length,
      successful: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'failure').length,
      timestamp: new Date().toISOString(),
    };

    // Log for monitoring
    console.warn('[Scheduler] Process results:', summary);

    return NextResponse.json({
      message: `Processed ${summary.processed} jobs`,
      ...summary,
      results,
    });
  }),
  '/api/scheduler/process',
  RateLimitPresets.ADMIN
);

/**
 * GET /api/scheduler/process
 * Get processing status (for health checks)
 */
export const GET = withRateLimit(
  withErrorHandling(async () => {
    return NextResponse.json({
      status: 'ok',
      message: 'Scheduler process endpoint ready',
      timestamp: new Date().toISOString(),
    });
  }),
  '/api/scheduler/process',
  RateLimitPresets.GENERAL
);
