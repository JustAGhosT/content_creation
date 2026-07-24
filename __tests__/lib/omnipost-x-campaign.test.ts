import { describe, expect, test } from '@jest/globals';
import {
  OMNIPOST_X_CAMPAIGN_ID,
  omnipostXCampaignPosts,
  omnipostXCampaignSeed,
} from '../../lib/seed/omnipost-x-campaign';

describe('OmniPost X starter campaign', () => {
  test('ships as a draft with only X enabled', () => {
    expect(omnipostXCampaignSeed).toEqual(
      expect.objectContaining({
        id: OMNIPOST_X_CAMPAIGN_ID,
        status: 'draft',
      })
    );
    expect(omnipostXCampaignSeed.platforms).toEqual([
      expect.objectContaining({
        platformId: 'twitter',
        platformName: 'X',
        enabled: true,
      }),
    ]);
    expect(omnipostXCampaignSeed.schedule.posts).toEqual([]);
  });

  test('contains three pending text-only posts within the X length limit', () => {
    expect(omnipostXCampaignPosts).toHaveLength(3);

    for (const post of omnipostXCampaignPosts) {
      expect(post.adaptations).toHaveLength(1);
      expect(post.adaptations[0]).toEqual(
        expect.objectContaining({
          platformId: 'twitter',
          platformName: 'X',
          status: 'pending',
          hashtags: [],
        })
      );
      expect(post.adaptations[0].content.length).toBeLessThanOrEqual(280);
      expect(post.adaptations[0].mediaUrls).toBeUndefined();
      expect(post.adaptations[0].scheduledTime).toBeUndefined();
    }
  });
});
