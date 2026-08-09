import { NextResponse } from 'next/server';
import { getCurrentUserId, isAuthenticated } from '@/app/api/_utils/auth';
import { Errors, withErrorHandling } from '@/app/api/_utils/errors';
import { withRateLimit, RateLimitPresets } from '@/app/api/_utils/rateLimit';
import { AnalyticsWorkbookError, buildCampaignWorkbook } from '@/lib/analytics/workbook';

export const GET = withRateLimit(
  withErrorHandling(async (request: Request) => {
    if (!(await isAuthenticated())) {
      return Errors.unauthorized('Authentication required to view campaign evidence');
    }
    const userId = await getCurrentUserId();
    if (!userId) return Errors.unauthorized('User ID not found');
    const campaignId = new URL(request.url).searchParams.get('campaignId');
    if (!campaignId || campaignId.length > 128) {
      return Errors.badRequest('A valid campaignId is required');
    }

    try {
      return NextResponse.json(await buildCampaignWorkbook(userId, campaignId));
    } catch (error) {
      if (error instanceof AnalyticsWorkbookError) {
        return NextResponse.json(
          { message: error.message, code: error.code },
          { status: error.code === 'CAMPAIGN_NOT_FOUND' ? 404 : 503 }
        );
      }
      throw error;
    }
  }),
  '/api/analytics/workbook',
  RateLimitPresets.GENERAL
);
