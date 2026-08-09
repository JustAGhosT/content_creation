import type { PrismaClient } from '@prisma/client';
import prisma from '@/lib/db/prisma';
import { stableStringify } from '@/lib/campaigns/contracts';
import { normalizedDimensions, type ValidatedAnalyticsEvent } from './contracts';

export class AnalyticsPersistenceError extends Error {
  constructor(
    public readonly code: 'DATABASE_UNAVAILABLE' | 'UNKNOWN_CAMPAIGN_TOKEN' | 'EVENT_ID_CONFLICT',
    message: string
  ) {
    super(message);
    this.name = 'AnalyticsPersistenceError';
  }
}

type AnalyticsClient = Pick<PrismaClient, 'analyticsEventRecord' | 'attributionLink'>;

function requireClient(client: AnalyticsClient | null = prisma): AnalyticsClient {
  if (!client) {
    throw new AnalyticsPersistenceError(
      'DATABASE_UNAVAILABLE',
      'Durable analytics persistence is unavailable'
    );
  }
  return client;
}

async function resolveCampaignOwner(
  client: AnalyticsClient,
  campaignToken: string | undefined
): Promise<{ userId: string; campaignId: string; campaignVersion: number } | null> {
  if (!campaignToken) return null;
  const match = await client.attributionLink.findUnique({
    where: { trackingToken: campaignToken },
    select: {
      campaign: { select: { userId: true, externalId: true, id: true } },
      campaignVersion: { select: { version: true } },
    },
  });
  const campaign = match?.campaign;
  return campaign && match
    ? {
        userId: campaign.userId,
        campaignId: campaign.externalId ?? campaign.id,
        campaignVersion: match.campaignVersion.version,
      }
    : null;
}

export async function recordAnalyticsEvents(
  events: ValidatedAnalyticsEvent[],
  authenticatedUserId?: string | null,
  clientOverride?: AnalyticsClient
): Promise<void> {
  const client = requireClient(clientOverride);

  for (const event of events) {
    const dimensions = normalizedDimensions(event.properties);
    const owner = await resolveCampaignOwner(client, dimensions.campaignToken);
    if (dimensions.campaignToken && !owner) {
      throw new AnalyticsPersistenceError(
        'UNKNOWN_CAMPAIGN_TOKEN',
        'The campaign token is not recognized'
      );
    }
    const properties = stableStringify(event.properties);
    const occurredAt = new Date(event.properties.timestamp ?? Date.now());
    const data = {
      eventId: event.eventId,
      name: event.name,
      userId: owner?.userId ?? authenticatedUserId ?? null,
      campaignId: owner?.campaignId ?? dimensions.campaignId ?? null,
      campaignVersion: owner?.campaignVersion ?? dimensions.campaignVersion ?? null,
      contentId: dimensions.contentId ?? null,
      variantId: dimensions.variantId ?? null,
      platform: dimensions.platform ?? null,
      publishAttemptId: dimensions.publishAttemptId ?? null,
      providerPostId: dimensions.providerPostId ?? null,
      campaignToken: dimensions.campaignToken ?? null,
      utmSource: dimensions.utmSource ?? null,
      utmMedium: dimensions.utmMedium ?? null,
      utmCampaign: dimensions.utmCampaign ?? null,
      utmContent: dimensions.utmContent ?? null,
      landingPage: dimensions.landingPage ?? null,
      properties,
      occurredAt,
    };
    const stored = await client.analyticsEventRecord.upsert({
      where: { eventId: event.eventId },
      create: data,
      update: {},
    });
    if (
      stored.name !== data.name ||
      stored.properties !== data.properties ||
      stored.userId !== data.userId
    ) {
      throw new AnalyticsPersistenceError(
        'EVENT_ID_CONFLICT',
        `Analytics event ID ${event.eventId} already identifies another event`
      );
    }
  }
}
