import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUserId, isAuthenticated } from '@/app/api/_utils/auth';
import { Errors, withErrorHandling } from '@/app/api/_utils/errors';
import { withRateLimit, RateLimitPresets } from '@/app/api/_utils/rateLimit';
import { createCampaignVersionSchema } from '@/lib/campaigns/contracts';
import { listCampaigns, saveCampaignVersion } from '@/lib/campaigns/repository';
import { campaignErrorResponse } from './_errors';

const publicCreateCampaignVersionSchema = createCampaignVersionSchema.extend({
  source: z.enum(['user', 'browser-import']).default('user'),
});

async function requireUserId(): Promise<string | Response> {
  if (!(await isAuthenticated())) {
    return Errors.unauthorized('Authentication required');
  }
  const userId = await getCurrentUserId();
  return userId ?? Errors.unauthorized('User ID not found');
}

export const GET = withRateLimit(
  withErrorHandling(async () => {
    const userId = await requireUserId();
    if (userId instanceof Response) return userId;

    try {
      return NextResponse.json({ campaigns: await listCampaigns(userId) });
    } catch (error) {
      return campaignErrorResponse(error) ?? Errors.internalServerError();
    }
  }),
  '/api/campaigns',
  RateLimitPresets.GENERAL
);

export const POST = withRateLimit(
  withErrorHandling(async request => {
    const userId = await requireUserId();
    if (userId instanceof Response) return userId;

    const validation = publicCreateCampaignVersionSchema.safeParse(await request.json());
    if (!validation.success) {
      return Errors.badRequest('Invalid campaign snapshot', validation.error.flatten());
    }

    try {
      const persisted = await saveCampaignVersion({
        userId,
        campaign: validation.data.campaign,
        expectedVersion: validation.data.expectedVersion,
        slug: validation.data.slug,
        source: validation.data.source,
      });
      return NextResponse.json(persisted, { status: 201 });
    } catch (error) {
      return campaignErrorResponse(error) ?? Errors.internalServerError();
    }
  }),
  '/api/campaigns',
  RateLimitPresets.GENERAL
);
