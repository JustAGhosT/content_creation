/**
 * Scheduler API Routes
 * GET - List scheduled jobs
 * POST - Create new scheduled job
 */

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getScheduler } from '@/lib/scheduler';
import { SchedulerQueueError } from '@/lib/scheduler/prisma-queue';
import type { JobStatus } from '@/lib/scheduler/types';
import { isAuthenticated, getCurrentUserId } from '@/app/api/_utils/auth';
import { Errors, withErrorHandling } from '@/app/api/_utils/errors';
import { withRateLimit, RateLimitPresets } from '@/app/api/_utils/rateLimit';
import { sanitizeText, validateAndSanitize } from '@/app/api/_utils/sanitize';
import { platforms } from '@/lib/config/platforms';
import { assertApprovedForQueue } from '@/lib/campaigns/repository';
import { campaignErrorResponse } from '@/app/api/campaigns/_errors';

// ── Zod Schemas ──────────────────────────────────────────────────────────

const listJobsQuerySchema = z.object({
  status: z
    .enum([
      'pending',
      'scheduled',
      'processing',
      'published',
      'failed',
      'dead',
      'reconciliation_required',
      'cancelled',
    ])
    .optional(),
  campaignId: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

const jobContentSchema = z.object({
  text: z
    .string()
    .min(1, 'Content text is required')
    .max(100_000, 'Content text too large')
    .transform(val => sanitizeText(val)),
  mediaUrls: z.array(z.string().url()).optional(),
  hashtags: z.array(z.string()).optional(),
  mentions: z.array(z.string()).optional(),
  isThread: z.boolean().optional(),
  threadParts: z
    .array(
      z.object({
        order: z.number().int().min(0),
        text: z
          .string()
          .min(1)
          .transform(val => sanitizeText(val)),
        mediaUrls: z.array(z.string().url()).optional(),
      })
    )
    .optional(),
});

const createJobSchema = z
  .object({
    type: z.enum(['campaign_post', 'series_promotion', 'standalone']),
    campaignId: z.string().min(1).optional(),
    campaignVersion: z.number().int().positive().optional(),
    contentHash: z
      .string()
      .regex(/^sha256:[a-f0-9]{64}$/)
      .optional(),
    variantId: z.string().min(1).optional(),
    contentId: z.string().min(1, 'contentId is required'),
    platformId: z.string().min(1, 'platformId is required'),
    content: jobContentSchema,
    scheduledTime: z.string().refine(val => !Number.isNaN(new Date(val).getTime()), {
      message: 'Invalid scheduledTime format',
    }),
    timezone: z.string().optional(),
    maxAttempts: z.number().int().min(1).max(20).optional(),
    idempotencyKey: z.string().min(8).max(200).optional(),
  })
  .superRefine((value, context) => {
    if (value.type !== 'campaign_post') return;
    for (const field of ['campaignId', 'campaignVersion', 'contentHash', 'variantId'] as const) {
      if (value[field] === undefined) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: `${field} is required for campaign posts`,
        });
      }
    }
  });

function getComingSoonPlatformName(platformId: string): string | undefined {
  const normalizedPlatformId = platformId.toLowerCase();
  const platform = platforms.find(p => p.slug === normalizedPlatformId);

  return platform?.comingSoon ? platform.name : undefined;
}

function isIdempotencyConflict(error: unknown): boolean {
  return (
    (error instanceof SchedulerQueueError && error.code === 'IDEMPOTENCY_CONFLICT') ||
    (typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'IDEMPOTENCY_CONFLICT')
  );
}

// ── Route Handlers ───────────────────────────────────────────────────────

/**
 * GET /api/scheduler
 * List scheduled jobs with optional filters (user-scoped)
 */
export const GET = withRateLimit(
  withErrorHandling(async (request: Request) => {
    if (!(await isAuthenticated())) {
      return Errors.unauthorized('Authentication required');
    }

    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return Errors.unauthorized('User ID not found');
    }

    const { searchParams } = new URL(request.url);
    const queryInput = {
      status: searchParams.get('status') || undefined,
      campaignId: searchParams.get('campaignId') || undefined,
      limit: searchParams.get('limit') || undefined,
      offset: searchParams.get('offset') || undefined,
    };

    const validation = validateAndSanitize(listJobsQuerySchema, queryInput);
    if (!validation.success) {
      return Errors.badRequest('Invalid query parameters: ' + validation.errors.join(', '));
    }

    const { status, campaignId, limit, offset } = validation.data;
    const scheduler = getScheduler();

    let jobs;
    if (campaignId) {
      jobs = await scheduler.getJobsByCampaign(campaignId, currentUserId);
    } else if (status) {
      jobs = await scheduler.getJobsByStatus(status as JobStatus, limit + offset, currentUserId);
    } else {
      jobs = await scheduler.getAllJobs(currentUserId);
    }

    // Apply pagination
    const paginated = jobs.slice(offset, offset + limit);

    return NextResponse.json({
      jobs: paginated,
      count: paginated.length,
      total: jobs.length,
    });
  }),
  '/api/scheduler',
  RateLimitPresets.GENERAL
);

/**
 * POST /api/scheduler
 * Create a new scheduled job (user-scoped)
 */
export const POST = withRateLimit(
  withErrorHandling(async (request: Request) => {
    if (!(await isAuthenticated())) {
      return Errors.unauthorized('Authentication required');
    }

    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return Errors.unauthorized('User ID not found');
    }

    const body = await request.json();

    const validation = validateAndSanitize(createJobSchema, body);
    if (!validation.success) {
      return Errors.badRequest('Invalid input: ' + validation.errors.join(', '));
    }

    const data = validation.data;
    const comingSoonPlatformName = getComingSoonPlatformName(data.platformId);
    if (comingSoonPlatformName) {
      return Errors.badRequest(`${comingSoonPlatformName} publishing is coming soon`);
    }

    let approvalBinding: Awaited<ReturnType<typeof assertApprovedForQueue>> | undefined;
    if (
      data.type === 'campaign_post' &&
      data.campaignId &&
      data.campaignVersion &&
      data.contentHash &&
      data.variantId
    ) {
      try {
        approvalBinding = await assertApprovedForQueue({
          userId: currentUserId,
          campaignId: data.campaignId,
          version: data.campaignVersion,
          contentId: data.contentId,
          variantId: data.variantId,
          platformId: data.platformId,
          contentHash: data.contentHash,
        });
      } catch (error) {
        return campaignErrorResponse(error) ?? Errors.internalServerError();
      }
    }

    const scheduler = getScheduler();
    let scheduled;
    try {
      const scheduleInput = {
        type: data.type,
        campaignId: data.campaignId,
        campaignVersion: data.campaignVersion,
        campaignVersionId: approvalBinding?.versionId,
        approvedContentHash: approvalBinding?.contentHash,
        variantId: data.variantId,
        contentId: data.contentId,
        platformId: data.platformId,
        content: approvalBinding?.content ?? data.content,
        scheduledTime: data.scheduledTime,
        timezone: data.timezone,
        maxAttempts: data.maxAttempts,
        createdBy: currentUserId,
        idempotencyKey: data.idempotencyKey,
      };
      scheduled = approvalBinding
        ? await scheduler.scheduleCampaignWithAudit(scheduleInput, {
            campaignId: data.campaignId!,
            campaignVersionId: approvalBinding.versionId,
            contentId: data.contentId,
            variantId: data.variantId!,
            platformId: data.platformId,
            contentHash: approvalBinding.contentHash,
            requestedBy: currentUserId,
          })
        : await scheduler.scheduleWithResult(scheduleInput);
    } catch (error) {
      if (isIdempotencyConflict(error)) {
        return Errors.conflict('Idempotency key already identifies another scheduler request');
      }
      throw error;
    }

    return NextResponse.json({ job: scheduled.job }, { status: scheduled.created ? 201 : 200 });
  }),
  '/api/scheduler',
  RateLimitPresets.GENERAL
);
