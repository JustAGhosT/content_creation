/**
 * Individual Job API Routes
 * GET - Get job details
 * PATCH - Update job (reschedule or retry)
 * DELETE - Cancel a job
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getScheduler } from '@/lib/scheduler';
import type { ScheduledJob } from '@/lib/scheduler/types';
import { isAuthenticated, getCurrentUserId } from '@/app/api/_utils/auth';
import { Errors, withErrorHandling } from '@/app/api/_utils/errors';
import { withRateLimit, RateLimitPresets } from '@/app/api/_utils/rateLimit';
import { validateAndSanitize } from '@/app/api/_utils/sanitize';

// ── Zod Schemas ──────────────────────────────────────────────────────────

const jobIdSchema = z.object({
  id: z.string().min(1, 'Job ID is required'),
});

const patchJobSchema = z
  .object({
    action: z.enum(['retry']).optional(),
    scheduledTime: z
      .string()
      .refine(val => !Number.isNaN(new Date(val).getTime()), {
        message: 'Invalid scheduledTime format',
      })
      .refine(val => new Date(val).getTime() > Date.now(), {
        message: 'scheduledTime must be in the future',
      })
      .optional(),
  })
  .refine(data => data.action || data.scheduledTime, {
    message: 'Either action or scheduledTime must be provided',
  });

// ── Helpers ──────────────────────────────────────────────────────────────

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Authenticate the request and return the user ID, or an error response
 */
async function requireUserId(): Promise<{ userId: string } | NextResponse> {
  if (!(await isAuthenticated())) {
    return Errors.unauthorized('Authentication required') as NextResponse;
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return Errors.unauthorized('User ID not found') as NextResponse;
  }

  return { userId };
}

function isAuthError(result: { userId: string } | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}

/**
 * Verify the job exists and the user owns it
 */
async function getOwnedJob(
  jobId: string,
  userId: string
): Promise<{ job: ScheduledJob } | NextResponse> {
  const scheduler = getScheduler();
  const job = await scheduler.getJob(jobId, userId);

  if (!job) {
    return Errors.notFound('Job not found') as NextResponse;
  }

  if (job.createdBy !== userId) {
    return Errors.forbidden('Access denied') as NextResponse;
  }

  return { job };
}

function isJobError(result: { job: ScheduledJob } | NextResponse): result is NextResponse {
  return result instanceof NextResponse;
}

// ── Route Handlers ───────────────────────────────────────────────────────

/**
 * GET /api/scheduler/[id]
 * Get job details (user-scoped)
 */
export const GET = withRateLimit(
  withErrorHandling(async (request: Request, context?: unknown) => {
    const authResult = await requireUserId();
    if (isAuthError(authResult)) return authResult;

    const { id } = await (context as RouteParams).params;
    const idValidation = validateAndSanitize(jobIdSchema, { id });
    if (!idValidation.success) {
      return Errors.badRequest('Invalid job ID: ' + idValidation.errors.join(', '));
    }

    const result = await getOwnedJob(idValidation.data.id, authResult.userId);
    if (isJobError(result)) return result;

    return NextResponse.json({ job: result.job });
  }),
  '/api/scheduler/[id]',
  RateLimitPresets.GENERAL
);

/**
 * PATCH /api/scheduler/[id]
 * Update job (reschedule or retry) - user-scoped
 */
export const PATCH = withRateLimit(
  withErrorHandling(async (request: Request, context?: unknown) => {
    const authResult = await requireUserId();
    if (isAuthError(authResult)) return authResult;

    const { id } = await (context as RouteParams).params;
    const idValidation = validateAndSanitize(jobIdSchema, { id });
    if (!idValidation.success) {
      return Errors.badRequest('Invalid job ID: ' + idValidation.errors.join(', '));
    }

    const body = await request.json();
    const bodyValidation = validateAndSanitize(patchJobSchema, body);
    if (!bodyValidation.success) {
      return Errors.badRequest('Invalid input: ' + bodyValidation.errors.join(', '));
    }

    const result = await getOwnedJob(idValidation.data.id, authResult.userId);
    if (isJobError(result)) return result;

    const scheduler = getScheduler();
    const { action, scheduledTime } = bodyValidation.data;

    // Handle retry action
    if (action === 'retry') {
      const retried = await scheduler.retry(idValidation.data.id, authResult.userId);
      if (!retried) {
        return Errors.notFound('Job not found');
      }
      return NextResponse.json({ message: 'Job queued for retry', job: retried });
    }

    // Handle reschedule
    if (scheduledTime) {
      const rescheduled = await scheduler.reschedule(
        idValidation.data.id,
        new Date(scheduledTime).toISOString(),
        authResult.userId
      );
      if (!rescheduled) {
        return Errors.notFound('Job not found');
      }
      return NextResponse.json({ message: 'Job rescheduled successfully', job: rescheduled });
    }

    return Errors.badRequest('No valid update provided');
  }),
  '/api/scheduler/[id]',
  RateLimitPresets.GENERAL
);

/**
 * DELETE /api/scheduler/[id]
 * Cancel a scheduled job (user-scoped)
 */
export const DELETE = withRateLimit(
  withErrorHandling(async (request: Request, context?: unknown) => {
    const authResult = await requireUserId();
    if (isAuthError(authResult)) return authResult;

    const { id } = await (context as RouteParams).params;
    const idValidation = validateAndSanitize(jobIdSchema, { id });
    if (!idValidation.success) {
      return Errors.badRequest('Invalid job ID: ' + idValidation.errors.join(', '));
    }

    const result = await getOwnedJob(idValidation.data.id, authResult.userId);
    if (isJobError(result)) return result;

    const scheduler = getScheduler();
    const cancelled = await scheduler.cancel(idValidation.data.id, authResult.userId);

    if (!cancelled) {
      return Errors.internalServerError('Failed to cancel job');
    }

    return NextResponse.json({
      message: 'Job cancelled successfully',
      jobId: idValidation.data.id,
    });
  }),
  '/api/scheduler/[id]',
  RateLimitPresets.GENERAL
);
