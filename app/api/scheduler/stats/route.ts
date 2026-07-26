/**
 * Scheduler Stats Route
 * GET - Get scheduler statistics
 */

import { NextResponse } from 'next/server';
import { getScheduler } from '@/lib/scheduler';
import { isAuthenticated, getCurrentUserId } from '@/app/api/_utils/auth';
import { Errors, withErrorHandling } from '@/app/api/_utils/errors';
import { withRateLimit, RateLimitPresets } from '@/app/api/_utils/rateLimit';
import type { JobStatus } from '@/lib/scheduler/types';

// Define all possible job statuses
const JOB_STATUSES: JobStatus[] = [
  'pending',
  'scheduled',
  'processing',
  'published',
  'failed',
  'dead',
  'reconciliation_required',
  'cancelled',
];

/**
 * GET /api/scheduler/stats
 * Get scheduler statistics (user-scoped)
 * Returns job counts by status and timestamp
 */
export const GET = withRateLimit(
  withErrorHandling(async () => {
    if (!(await isAuthenticated())) {
      return Errors.unauthorized('Authentication required');
    }

    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return Errors.unauthorized('User ID not found');
    }

    const scheduler = getScheduler();

    // Get all jobs and filter by user
    const userJobs = await scheduler.getAllJobs(currentUserId);

    // Calculate user-specific stats dynamically from JobStatus enum
    const userStats: Record<string, number> = {
      total: userJobs.length,
    };

    // Build status counts from enum to stay in sync with scheduler types
    for (const status of JOB_STATUSES) {
      userStats[status] = userJobs.filter(j => j.status === status).length;
    }

    return NextResponse.json({
      stats: userStats,
      timestamp: new Date().toISOString(),
    });
  }),
  '/api/scheduler/stats',
  RateLimitPresets.GENERAL
);
