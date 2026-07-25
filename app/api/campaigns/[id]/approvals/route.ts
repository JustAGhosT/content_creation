import { NextResponse } from 'next/server';
import { getCurrentUserId, isAuthenticated } from '@/app/api/_utils/auth';
import { Errors, withErrorHandling } from '@/app/api/_utils/errors';
import { withRateLimit, RateLimitPresets } from '@/app/api/_utils/rateLimit';
import { approvalSchema } from '@/lib/campaigns/contracts';
import { recordApproval } from '@/lib/campaigns/repository';
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
    const { id } = await (context as RouteParams).params;
    const validation = approvalSchema.safeParse(await request.json());
    if (!validation.success) {
      return Errors.badRequest('Invalid approval', validation.error.flatten());
    }

    try {
      const approval = await recordApproval({
        userId,
        campaignId: id,
        ...validation.data,
      });
      return NextResponse.json({ approval }, { status: 201 });
    } catch (error) {
      return campaignErrorResponse(error) ?? Errors.internalServerError();
    }
  }),
  '/api/campaigns/[id]/approvals',
  RateLimitPresets.GENERAL
);
