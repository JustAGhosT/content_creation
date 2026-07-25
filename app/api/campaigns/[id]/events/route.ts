import { NextResponse } from 'next/server';
import { getCurrentUserId, isAuthenticated } from '@/app/api/_utils/auth';
import { Errors, withErrorHandling } from '@/app/api/_utils/errors';
import { withRateLimit, RateLimitPresets } from '@/app/api/_utils/rateLimit';
import { campaignEventSchema } from '@/lib/campaigns/contracts';
import { recordAiGeneration, recordCampaignDecision } from '@/lib/campaigns/repository';
import { campaignErrorResponse } from '../../_errors';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export const POST = withRateLimit(
  withErrorHandling(async (request, context) => {
    if (!(await isAuthenticated())) {
      return Errors.unauthorized('Authentication required');
    }
    const userId = await getCurrentUserId();
    if (!userId) {
      return Errors.unauthorized('User ID not found');
    }
    const { id: campaignId } = await (context as RouteParams).params;
    const validation = campaignEventSchema.safeParse(await request.json());
    if (!validation.success) {
      return Errors.badRequest('Invalid campaign event', validation.error.flatten());
    }

    try {
      const event = validation.data;
      if (event.type === 'ai-generation') {
        return NextResponse.json(await recordAiGeneration({ userId, campaignId, ...event }), {
          status: 201,
        });
      }
      return NextResponse.json(await recordCampaignDecision({ userId, campaignId, ...event }), {
        status: 201,
      });
    } catch (error) {
      return campaignErrorResponse(error) ?? Errors.internalServerError();
    }
  }),
  '/api/campaigns/[id]/events',
  RateLimitPresets.GENERAL
);
