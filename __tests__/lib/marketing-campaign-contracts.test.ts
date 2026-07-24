/** @jest-environment node */

import { describe, expect, test } from '@jest/globals';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { OMNIPOST_X_CAMPAIGN_ID, omnipostXCampaignPosts } from '../../lib/seed/omnipost-x-campaign';

type CampaignContract = {
  campaignId: string;
  platforms: string[];
  contentItems: Array<{
    contentId: string;
    body: string;
    adaptations: Array<{
      platformId: string;
      body: string;
    }>;
  }>;
};

const campaignPath = path.join(process.cwd(), 'marketing', 'campaigns', 'omnipost-x-live-001.yaml');
const campaign = parse(readFileSync(campaignPath, 'utf8')) as CampaignContract;

describe('marketing campaign contracts', () => {
  test('keeps the canonical X campaign aligned with the runtime seed', () => {
    expect(campaign.campaignId).toBe(OMNIPOST_X_CAMPAIGN_ID);
    expect(campaign.platforms).toEqual(['twitter']);
    expect(campaign.contentItems).toHaveLength(omnipostXCampaignPosts.length);

    for (const [index, contractContent] of campaign.contentItems.entries()) {
      const seedContent = omnipostXCampaignPosts[index];
      expect(contractContent).toEqual(
        expect.objectContaining({
          contentId: seedContent.id,
          body: seedContent.body,
        })
      );
      expect(contractContent.adaptations).toEqual([
        expect.objectContaining({
          platformId: seedContent.adaptations[0].platformId,
          body: seedContent.adaptations[0].content,
        }),
      ]);
    }
  });

  test('uses one stable platform adaptation per content item', () => {
    const variantCount = campaign.contentItems.reduce(
      (total, content) => total + content.adaptations.length,
      0
    );

    expect(variantCount).toBe(campaign.contentItems.length);
  });
});
