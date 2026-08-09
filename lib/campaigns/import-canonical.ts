import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'yaml';
import { z } from 'zod';
import { OMNIPOST_X_CAMPAIGN_ID, omnipostXCampaignSeed } from '@/lib/seed/omnipost-x-campaign';
import { recordAttributionLinks, saveCampaignVersion } from './repository';

const canonicalCampaignSchema = z
  .object({
    campaignId: z.literal(OMNIPOST_X_CAMPAIGN_ID),
    slug: z.literal('omnipost-x-live-001'),
    attribution: z
      .object({
        utmId: z.string(),
        source: z.string(),
        medium: z.string(),
        campaign: z.string(),
      })
      .strict(),
    contentItems: z.array(
      z
        .object({
          contentId: z.string(),
          adaptations: z.array(
            z
              .object({
                variantId: z.string(),
                platformId: z.string(),
                attribution: z
                  .object({
                    utmContent: z.string(),
                    trackingToken: z.string(),
                  })
                  .strict(),
              })
              .passthrough()
          ),
        })
        .passthrough()
    ),
  })
  .passthrough();

export async function importCanonicalXCampaign(userId: string) {
  const file = path.join(process.cwd(), 'marketing', 'campaigns', 'omnipost-x-live-001.yaml');
  const contract = canonicalCampaignSchema.parse(parse(await readFile(file, 'utf8')));
  const persisted = await saveCampaignVersion({
    userId,
    campaign: omnipostXCampaignSeed,
    expectedVersion: undefined,
    slug: contract.slug,
    source: 'git-import',
  });

  const attributionLinks = await recordAttributionLinks({
    userId,
    campaignId: contract.campaignId,
    version: persisted.version,
    links: contract.contentItems.flatMap(content =>
      content.adaptations.map(adaptation => ({
        contentId: content.contentId,
        variantId: adaptation.variantId,
        platformId: adaptation.platformId,
        trackingToken: adaptation.attribution.trackingToken,
        utmId: contract.attribution.utmId,
        utmSource: contract.attribution.source,
        utmMedium: contract.attribution.medium,
        utmCampaign: contract.attribution.campaign,
        utmContent: adaptation.attribution.utmContent,
      }))
    ),
  });

  return { ...persisted, attributionLinks };
}
