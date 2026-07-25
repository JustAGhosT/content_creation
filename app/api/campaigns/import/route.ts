import { NextResponse } from 'next/server';
import { getCurrentUserId, isAuthenticated } from '@/app/api/_utils/auth';
import { Errors, withErrorHandling } from '@/app/api/_utils/errors';
import { withRateLimit, RateLimitPresets } from '@/app/api/_utils/rateLimit';
import { importCanonicalXCampaign } from '@/lib/campaigns/import-canonical';
import { campaignErrorResponse } from '../_errors';

export const POST = withRateLimit(
  withErrorHandling(async () => {
    if (!(await isAuthenticated())) {
      return Errors.unauthorized('Authentication required');
    }
    const userId = await getCurrentUserId();
    if (!userId) {
      return Errors.unauthorized('User ID not found');
    }

    try {
      return NextResponse.json(await importCanonicalXCampaign(userId), { status: 201 });
    } catch (error) {
      return campaignErrorResponse(error) ?? Errors.internalServerError();
    }
  }),
  '/api/campaigns/import',
  RateLimitPresets.GENERAL
);
