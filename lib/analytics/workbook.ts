import type { PrismaClient } from '@prisma/client';
import prisma from '@/lib/db/prisma';

export class AnalyticsWorkbookError extends Error {
  constructor(
    public readonly code: 'DATABASE_UNAVAILABLE' | 'CAMPAIGN_NOT_FOUND',
    message: string
  ) {
    super(message);
    this.name = 'AnalyticsWorkbookError';
  }
}

function parseEvidence(value: string | null): Record<string, unknown> | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function countBy<T>(items: T[], key: (item: T) => string): Record<string, number> {
  return items.reduce<Record<string, number>>((counts, item) => {
    const value = key(item);
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

export async function buildCampaignWorkbook(
  userId: string,
  campaignIdentifier: string,
  client: PrismaClient | null = prisma
) {
  if (!client) {
    throw new AnalyticsWorkbookError(
      'DATABASE_UNAVAILABLE',
      'Durable analytics persistence is unavailable'
    );
  }

  const campaign = await client.campaign.findFirst({
    where: {
      userId,
      OR: [{ id: campaignIdentifier }, { externalId: campaignIdentifier }],
    },
    include: {
      versions: {
        orderBy: { version: 'desc' },
        take: 1,
        include: { approvals: true },
      },
      attributionLinks: true,
      publishAttempts: { orderBy: { requestedAt: 'asc' } },
      decisions: { orderBy: { decidedAt: 'asc' } },
    },
  });
  if (!campaign) {
    throw new AnalyticsWorkbookError('CAMPAIGN_NOT_FOUND', 'Campaign not found');
  }

  const stableCampaignId = campaign.externalId ?? campaign.id;
  const [events, jobs, accounts, quotas] = await Promise.all([
    client.analyticsEventRecord.findMany({
      where: { userId, campaignId: stableCampaignId },
      orderBy: { occurredAt: 'asc' },
    }),
    client.schedulerJob.findMany({
      where: { userId, campaignId: stableCampaignId },
      orderBy: { createdAt: 'asc' },
    }),
    client.platformAccount.findMany({
      where: { userId },
      select: {
        platform: true,
        providerUsername: true,
        status: true,
        expiresAt: true,
        refreshedAt: true,
        revokedAt: true,
      },
    }),
    client.schedulerPlatformQuota.findMany(),
  ]);

  const eventCounts = countBy(events, event => event.name);
  const malformedLinks = campaign.attributionLinks.filter(
    link =>
      !/^mtk_[a-z0-9_]+$/.test(link.trackingToken) ||
      !/^utm_[a-z0-9_]+$/.test(link.utmId) ||
      !link.utmSource ||
      !link.utmMedium ||
      !link.utmCampaign ||
      !link.utmContent
  );
  const campaignEvents = events.filter(event => event.name.startsWith('publish_'));
  const incompleteEvents = campaignEvents.filter(
    event => !event.contentId || !event.variantId || !event.platform
  );
  const publishedJobs = jobs.filter(job => job.status === 'published');
  const failedJobs = jobs.filter(job => ['failed', 'dead'].includes(job.status));
  const reconciliationRequiredJobs = jobs.filter(job => job.status === 'reconciliation_required');
  const latencies = campaign.publishAttempts
    .filter(attempt => attempt.completedAt)
    .map(attempt => attempt.completedAt!.getTime() - attempt.requestedAt.getTime());
  const attemptedPublishes = jobs.reduce((total, job) => total + job.attempts, 0);
  const unknownPublishAttempts = reconciliationRequiredJobs.length;
  const failedPublishAttempts = Math.max(
    0,
    attemptedPublishes - publishedJobs.length - unknownPublishAttempts
  );
  const attribution = campaign.attributionLinks.map(link => ({
    contentId: link.contentId,
    variantId: link.variantId,
    platform: link.platformId,
    campaignToken: link.trackingToken,
    utm: {
      id: link.utmId,
      source: link.utmSource,
      medium: link.utmMedium,
      campaign: link.utmCampaign,
      content: link.utmContent,
    },
    landingViews: events.filter(
      event => event.campaignToken === link.trackingToken && event.name === 'landing_view'
    ).length,
    ctaClicks: events.filter(
      event => event.campaignToken === link.trackingToken && event.name === 'cta_clicked'
    ).length,
    signupCompleted: events.filter(
      event => event.campaignToken === link.trackingToken && event.name === 'signup_completed'
    ).length,
  }));
  const decisions = campaign.decisions.map(decision => {
    const evidence = parseEvidence(decision.evidence);
    return {
      id: decision.id,
      decision: decision.decision,
      rationale: decision.rationale,
      decidedBy: decision.decidedBy,
      decidedAt: decision.decidedAt,
      evidence,
      workbookEvidenceCited: Boolean(
        evidence && ('workbook' in evidence || 'workbookVersion' in evidence)
      ),
    };
  });
  const latestVersion = campaign.versions[0];
  const missingPreflight: string[] = [];
  if (!latestVersion) missingPreflight.push('campaign_version');
  if (!latestVersion?.approvals.some(approval => approval.state === 'approved')) {
    missingPreflight.push('approved_content');
  }
  if (campaign.attributionLinks.length === 0) missingPreflight.push('attribution_links');
  if (malformedLinks.length > 0) missingPreflight.push('valid_attribution_tags');

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    campaign: {
      id: stableCampaignId,
      name: campaign.name,
      status: campaign.status,
      currentVersion: campaign.currentVersion,
    },
    views: {
      preflight: {
        complete: missingPreflight.length === 0,
        missing: missingPreflight,
        versionCount: campaign.currentVersion,
        approvedContent:
          latestVersion?.approvals.filter(approval => approval.state === 'approved').length ?? 0,
        attributionLinks: campaign.attributionLinks.length,
      },
      approvalAndScheduling: {
        approved:
          latestVersion?.approvals.filter(approval => approval.state === 'approved').length ?? 0,
        queued: jobs.length,
        attempted: attemptedPublishes,
        published: publishedJobs.length,
        failed: failedJobs.length,
        reconciliationRequired: reconciliationRequiredJobs.length,
      },
      publishPerformance: {
        succeeded: publishedJobs.length,
        failed: failedPublishAttempts,
        unknown: unknownPublishAttempts,
        retries: jobs.reduce((total, job) => total + Math.max(0, job.attempts - 1), 0),
        averageLatencyMs:
          latencies.length > 0
            ? Math.round(
                latencies.reduce((total, latency) => total + latency, 0) / latencies.length
              )
            : null,
      },
      providerDrilldown: jobs.map(job => ({
        jobId: job.id,
        publishAttemptId:
          campaign.publishAttempts.find(attempt => attempt.schedulerJobId === job.id)?.id ?? null,
        contentId: job.contentId,
        variantId: job.variantId,
        platform: job.platformId,
        status: job.status,
        attempts: job.attempts,
        providerPostId: job.platformPostId,
        publishedUrl: job.publishedUrl,
        errorCode: job.errorCode,
      })),
      attribution,
      conversion: {
        landingViews: eventCounts.landing_view ?? 0,
        ctaClicks: eventCounts.cta_clicked ?? 0,
        signupStarted: eventCounts.signup_started ?? 0,
        signupCompleted: eventCounts.signup_completed ?? 0,
        firstPublish: publishedJobs.length > 0 ? 1 : 0,
      },
      dataQuality: {
        malformedAttributionLinkIds: malformedLinks.map(link => link.id),
        incompleteEventIds: incompleteEvents.map(event => event.eventId),
        reconciliationRequiredJobIds: reconciliationRequiredJobs.map(job => job.id),
      },
      platformHealth: {
        accounts,
        quotas: quotas.map(quota => ({
          platform: quota.platformId,
          remaining: Math.max(0, quota.requestLimit - quota.requestCount),
          backoffUntil: quota.backoffUntil,
          windowStart: quota.windowStart,
        })),
      },
      decisions,
    },
    reconciliation: {
      runtime: {
        queued: jobs.length,
        attempted: attemptedPublishes,
        succeeded: publishedJobs.length,
        failed: failedPublishAttempts,
        unknown: unknownPublishAttempts,
      },
      telemetry: {
        queued: eventCounts.publish_job_queued ?? 0,
        attempted: eventCounts.publish_attempted ?? 0,
        succeeded: eventCounts.publish_succeeded ?? 0,
        failed: eventCounts.publish_failed ?? 0,
      },
      reconciled:
        jobs.length === (eventCounts.publish_job_queued ?? 0) &&
        attemptedPublishes === (eventCounts.publish_attempted ?? 0) &&
        publishedJobs.length === (eventCounts.publish_succeeded ?? 0) &&
        failedPublishAttempts === (eventCounts.publish_failed ?? 0) &&
        unknownPublishAttempts === 0,
    },
  };
}
