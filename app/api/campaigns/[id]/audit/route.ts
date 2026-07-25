import { NextResponse } from 'next/server';
import { getCurrentUserId, isAuthenticated } from '@/app/api/_utils/auth';
import { Errors, withErrorHandling } from '@/app/api/_utils/errors';
import { withRateLimit, RateLimitPresets } from '@/app/api/_utils/rateLimit';
import { campaignAudit } from '@/lib/campaigns/repository';
import { campaignErrorResponse } from '../../_errors';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export const GET = withRateLimit(
  withErrorHandling(async (_request, context) => {
    if (!(await isAuthenticated())) {
      return Errors.unauthorized('Authentication required');
    }
    const userId = await getCurrentUserId();
    if (!userId) {
      return Errors.unauthorized('User ID not found');
    }
    const { id } = await (context as RouteParams).params;

    try {
      return NextResponse.json({ audit: await campaignAudit(userId, id) });
    } catch (error) {
      return campaignErrorResponse(error) ?? Errors.internalServerError();
    }
  }),
  '/api/campaigns/[id]/audit',
  RateLimitPresets.GENERAL
);
