/** @jest-environment node */

import type { PrismaClient } from '@prisma/client';
import { buildCampaignWorkbook } from '@/lib/analytics/workbook';

describe('campaign evidence workbook', () => {
  test('reconciles durable scheduler records with allow-listed telemetry', async () => {
    const requestedAt = new Date('2026-08-09T01:00:00.000Z');
    const completedAt = new Date('2026-08-09T01:00:02.000Z');
    const campaign = {
      id: 'campaign-row-1',
      externalId: 'omnipost-x-live-001',
      name: 'OmniPost X live',
      status: 'active',
      currentVersion: 1,
      versions: [
        {
          id: 'version-1',
          approvals: [
            {
              id: 'approval-1',
              contentId: 'content-1',
              variantId: 'variant-x-1',
              state: 'approved',
              contentHash: 'sha256:approved',
              reviewedAt: new Date('2026-08-09T00:30:00.000Z'),
            },
          ],
        },
      ],
      attributionLinks: [
        {
          id: 'link-1',
          campaignVersionId: 'version-1',
          contentId: 'content-1',
          variantId: 'variant-x-1',
          platformId: 'twitter',
          trackingToken: 'mtk_omnipost_x_1',
          utmId: 'utm_omnipost_x_1',
          utmSource: 'x',
          utmMedium: 'organic_social',
          utmCampaign: 'omnipost-x-live-001',
          utmContent: 'variant-x-1',
        },
      ],
      publishAttempts: [
        {
          id: 'attempt-1',
          schedulerJobId: 'job-1',
          requestedAt,
          completedAt,
        },
      ],
      decisions: [
        {
          id: 'decision-1',
          decision: 'continue',
          rationale: 'The governed publish succeeded.',
          evidence: JSON.stringify({ workbookVersion: 1 }),
          decidedBy: 'operator-1',
          decidedAt: completedAt,
        },
      ],
    };
    const events = [
      'publish_job_queued',
      'publish_attempted',
      'publish_succeeded',
      'landing_view',
    ].map((name, index) => ({
      eventId: `event-${index}`,
      name,
      contentId: name.startsWith('publish_') ? 'content-1' : null,
      variantId: name.startsWith('publish_') ? 'variant-x-1' : null,
      platform: name.startsWith('publish_') ? 'twitter' : null,
      campaignToken: name === 'landing_view' ? 'mtk_omnipost_x_1' : null,
      userId: 'user-1',
    }));
    events.push({
      eventId: 'event-signup-completed',
      name: 'signup_completed',
      contentId: null,
      variantId: null,
      platform: null,
      campaignToken: 'mtk_omnipost_x_1',
      userId: 'converted-user-1',
    });
    const jobs: Array<{
      id: string;
      contentId: string;
      variantId: string;
      platformId: string;
      status: string;
      attempts: number;
      platformPostId: string | null;
      publishedUrl: string | null;
      errorCode: string | null;
    }> = [
      {
        id: 'job-1',
        contentId: 'content-1',
        variantId: 'variant-x-1',
        platformId: 'twitter',
        status: 'published',
        attempts: 1,
        platformPostId: '2086262766420037970',
        publishedUrl: 'https://x.com/OmniPostHQ/status/2086262766420037970',
        errorCode: null,
      },
    ];
    const client = {
      campaign: { findFirst: jest.fn().mockResolvedValue(campaign) },
      analyticsEventRecord: {
        findMany: jest.fn().mockResolvedValue(events),
        count: jest.fn().mockResolvedValue(1),
      },
      schedulerJob: { findMany: jest.fn().mockResolvedValue(jobs) },
      platformAccount: { findMany: jest.fn().mockResolvedValue([]) },
      schedulerPlatformQuota: { findMany: jest.fn().mockResolvedValue([]) },
    } as unknown as PrismaClient;

    const workbook = await buildCampaignWorkbook('user-1', 'omnipost-x-live-001', client);

    expect(workbook.views.preflight.complete).toBe(true);
    expect(workbook.views.publishPerformance).toMatchObject({
      succeeded: 1,
      failed: 0,
      retries: 0,
      averageLatencyMs: 2000,
    });
    expect(workbook.views.attribution[0]).toMatchObject({ landingViews: 1 });
    expect(workbook.views.conversion.firstPublish).toBe(1);
    expect(client.analyticsEventRecord.count).toHaveBeenCalledWith({
      where: { name: 'post_published', userId: { in: ['converted-user-1'] } },
    });
    expect(workbook.views.decisions[0].workbookEvidenceCited).toBe(true);
    expect(workbook.reconciliation.reconciled).toBe(true);

    events.push(
      {
        eventId: 'event-unknown-queued',
        name: 'publish_job_queued',
        contentId: 'content-1',
        variantId: 'variant-x-1',
        platform: 'twitter',
        campaignToken: null,
        userId: 'user-1',
      },
      {
        eventId: 'event-unknown-attempted',
        name: 'publish_attempted',
        contentId: 'content-1',
        variantId: 'variant-x-1',
        platform: 'twitter',
        campaignToken: null,
        userId: 'user-1',
      }
    );
    jobs.push({
      id: 'job-unknown',
      contentId: 'content-1',
      variantId: 'variant-x-1',
      platformId: 'twitter',
      status: 'reconciliation_required',
      attempts: 1,
      platformPostId: null,
      publishedUrl: null,
      errorCode: 'LEASE_EXPIRED_AFTER_PROVIDER_ATTEMPT',
    });

    const workbookWithUnknownOutcome = await buildCampaignWorkbook(
      'user-1',
      'omnipost-x-live-001',
      client
    );
    expect(workbookWithUnknownOutcome.views.publishPerformance).toMatchObject({
      succeeded: 1,
      failed: 0,
      unknown: 1,
    });
    expect(workbookWithUnknownOutcome.views.dataQuality.reconciliationRequiredJobIds).toEqual([
      'job-unknown',
    ]);
    expect(workbookWithUnknownOutcome.reconciliation.runtime).toMatchObject({
      attempted: 2,
      succeeded: 1,
      failed: 0,
      unknown: 1,
    });
    expect(workbookWithUnknownOutcome.reconciliation.reconciled).toBe(false);

    campaign.versions[0].approvals.push({
      id: 'approval-2',
      contentId: 'content-1',
      variantId: 'variant-x-1',
      state: 'rejected',
      contentHash: 'sha256:approved',
      reviewedAt: new Date('2026-08-09T00:45:00.000Z'),
    });
    const workbookAfterRejection = await buildCampaignWorkbook(
      'user-1',
      'omnipost-x-live-001',
      client
    );
    expect(workbookAfterRejection.views.preflight).toMatchObject({
      complete: false,
      approvedContent: 0,
      missing: expect.arrayContaining(['approved_content']),
    });
    expect(workbookAfterRejection.views.approvalAndScheduling.approved).toBe(0);

    campaign.attributionLinks[0].campaignVersionId = 'version-0';
    const workbookWithoutCurrentLinks = await buildCampaignWorkbook(
      'user-1',
      'omnipost-x-live-001',
      client
    );
    expect(workbookWithoutCurrentLinks.views.preflight).toMatchObject({
      complete: false,
      attributionLinks: 0,
      missing: expect.arrayContaining(['attribution_links']),
    });
    expect(workbookWithoutCurrentLinks.views.dataQuality.malformedAttributionLinkIds).toEqual([]);
  });
});
