import { NextResponse } from 'next/server';
import { getCurrentUserId, getVerifiedCurrentUserId, isAuthenticated } from '../../_utils/auth';
import { Errors, withErrorHandling } from '../../_utils/errors';
import { withRateLimit, RateLimitPresets } from '../../_utils/rateLimit';
import { logToAuditTrail } from '../../_utils/audit';
import { analyticsBatchSchema, analyticsEventNameSchema } from '@/lib/analytics/contracts';
import { AnalyticsPersistenceError, recordAnalyticsEvents } from '@/lib/analytics/repository';
import prisma from '@/lib/db/prisma';

const significantEventNames = new Set([
  'signup_completed',
  'platform_connected',
  'publish_succeeded',
  'publish_failed',
]);

const serverOnlyEventNames = new Set([
  'campaign_created',
  'content_approved',
  'publish_job_queued',
  'publish_attempted',
  'publish_succeeded',
  'publish_failed',
]);

export const POST = withRateLimit(
  withErrorHandling(async (request: Request) => {
    const validation = analyticsBatchSchema.safeParse(await request.json());
    if (!validation.success) {
      return NextResponse.json(
        { message: 'Invalid event batch', errors: validation.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    if (validation.data.events.some(event => serverOnlyEventNames.has(event.name))) {
      return Errors.forbidden('Campaign lifecycle events are recorded by trusted server workflows');
    }

    const userId = await getVerifiedCurrentUserId();
    try {
      await recordAnalyticsEvents(validation.data.events, userId);
    } catch (error) {
      if (error instanceof AnalyticsPersistenceError) {
        const status =
          error.code === 'EVENT_ID_CONFLICT'
            ? 409
            : error.code === 'DATABASE_UNAVAILABLE'
              ? 503
              : 400;
        return NextResponse.json({ message: error.message, code: error.code }, { status });
      }
      throw error;
    }

    const significantEvents = validation.data.events.filter(event =>
      significantEventNames.has(event.name)
    );
    if (significantEvents.length > 0) {
      await logToAuditTrail({
        action: 'ANALYTICS_SIGNIFICANT_EVENTS',
        user: 'analytics',
        timestamp: new Date().toISOString(),
        path: '/api/analytics/events',
        method: 'POST',
        body: {
          eventNames: significantEvents.map(event => event.name),
          count: significantEvents.length,
        },
      });
    }

    return NextResponse.json({ success: true, received: validation.data.events.length });
  }),
  '/api/analytics/events',
  RateLimitPresets.GENERAL
);

export const GET = withRateLimit(
  withErrorHandling(async (request: Request) => {
    if (!(await isAuthenticated())) {
      return Errors.unauthorized('Authentication required to view analytics');
    }
    const userId = await getCurrentUserId();
    if (!userId) return Errors.unauthorized('User ID not found');
    if (!prisma) {
      return NextResponse.json(
        { message: 'Durable analytics persistence is unavailable' },
        { status: 503 }
      );
    }

    const url = new URL(request.url);
    const eventName = url.searchParams.get('event');
    const since = url.searchParams.get('since');
    const campaignId = url.searchParams.get('campaignId');
    if (eventName && !analyticsEventNameSchema.safeParse(eventName).success) {
      return Errors.badRequest('Unknown analytics event name');
    }
    const sinceDate = since ? new Date(since) : null;
    if (sinceDate && Number.isNaN(sinceDate.getTime())) {
      return Errors.badRequest('Invalid since timestamp');
    }

    const events = await prisma.analyticsEventRecord.findMany({
      where: {
        userId,
        name: eventName ?? undefined,
        campaignId: campaignId ?? undefined,
        occurredAt: sinceDate ? { gte: sinceDate } : undefined,
      },
      select: { name: true },
      orderBy: { occurredAt: 'asc' },
    });
    const counts = events.reduce<Record<string, number>>((result, event) => {
      result[event.name] = (result[event.name] ?? 0) + 1;
      return result;
    }, {});

    return NextResponse.json({
      totalEvents: events.length,
      counts,
      funnel: {
        acquisition: {
          pageViews: counts.page_viewed ?? counts.landing_view ?? 0,
          signupStarted: counts.signup_started ?? 0,
          signupCompleted: counts.signup_completed ?? 0,
        },
        activation: {
          platformConnected: counts.platform_connected ?? 0,
          postCreated: counts.post_created ?? 0,
          postPublished: counts.publish_succeeded ?? counts.post_published ?? 0,
        },
        revenue: {
          pricingViewed: counts.pricing_page_viewed ?? 0,
          trialStarted: counts.trial_started ?? 0,
          paymentCompleted: counts.payment_completed ?? 0,
        },
        referral: {
          linkShared: counts.referral_link_shared ?? 0,
          referralSignup: counts.referral_signup ?? 0,
        },
      },
    });
  }),
  '/api/analytics/events',
  RateLimitPresets.GENERAL
);
