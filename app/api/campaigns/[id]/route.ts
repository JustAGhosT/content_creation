import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUserId, isAuthenticated } from '@/app/api/_utils/auth';
import { Errors, withErrorHandling } from '@/app/api/_utils/errors';
import { withRateLimit, RateLimitPresets } from '@/app/api/_utils/rateLimit';
import { createCampaignVersionSchema } from '@/lib/campaigns/contracts';
import { deleteCampaign, getCampaign, saveCampaignVersion } from '@/lib/campaigns/repository';
import { campaignErrorResponse } from '../_errors';

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function requireUserId(): Promise<string | Response> {
  if (!(await isAuthenticated())) {
    return Errors.unauthorized('Authentication required');
  }
  const userId = await getCurrentUserId();
  return userId ?? Errors.unauthorized('User ID not found');
}

const updateSchema = createCampaignVersionSchema.extend({
  expectedVersion: z.number().int().positive(),
});

export const GET = withRateLimit(
  withErrorHandling(async (_request, context) => {
    const userId = await requireUserId();
    if (userId instanceof Response) return userId;
    const { id } = await (context as RouteParams).params;

    try {
      return NextResponse.json(await getCampaign(userId, id));
    } catch (error) {
      return campaignErrorResponse(error) ?? Errors.internalServerError();
    }
  }),
  '/api/campaigns/[id]',
  RateLimitPresets.GENERAL
);

export const PUT = withRateLimit(
  withErrorHandling(async (request, context) => {
    const userId = await requireUserId();
    if (userId instanceof Response) return userId;
    const { id } = await (context as RouteParams).params;

    const validation = updateSchema.safeParse(await request.json());
    if (!validation.success || validation.data.campaign.id !== id) {
      return Errors.badRequest(
        'Invalid campaign snapshot',
        validation.success ? undefined : validation.error.flatten()
      );
    }

    try {
      return NextResponse.json(
        await saveCampaignVersion({
          userId,
          campaign: validation.data.campaign,
          expectedVersion: validation.data.expectedVersion,
          slug: validation.data.slug,
          source: validation.data.source,
        })
      );
    } catch (error) {
      return campaignErrorResponse(error) ?? Errors.internalServerError();
    }
  }),
  '/api/campaigns/[id]',
  RateLimitPresets.GENERAL
);

export const DELETE = withRateLimit(
  withErrorHandling(async (_request, context) => {
    const userId = await requireUserId();
    if (userId instanceof Response) return userId;
    const { id } = await (context as RouteParams).params;

    try {
      await deleteCampaign(userId, id);
      return new Response(null, { status: 204 });
    } catch (error) {
      return campaignErrorResponse(error) ?? Errors.internalServerError();
    }
  }),
  '/api/campaigns/[id]',
  RateLimitPresets.GENERAL
);
