/**
 * OmniPost's first controlled live campaign.
 *
 * The campaign intentionally starts as a draft with one text-only platform.
 * Operators publish the smoke post first, verify the returned X post URL and
 * audit evidence, and only then schedule the remaining posts.
 */

import type { Campaign, CampaignContent } from '@/types/campaign';

export const OMNIPOST_X_CAMPAIGN_ID = 'campaign_omnipost_x_live_001';

const CREATED_AT = '2026-07-24T00:00:00Z';

function createPost(id: string, title: string, body: string): CampaignContent {
  return {
    id,
    type: 'standalone',
    title,
    body,
    summary: title,
    adaptations: [
      {
        platformId: 'twitter',
        platformName: 'X',
        content: body,
        hashtags: [],
        status: 'pending',
      },
    ],
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
  };
}

export const omnipostXCampaignPosts: CampaignContent[] = [
  createPost(
    'content_omnipost_x_001',
    'Prove one real publishing path',
    `A publishing tool shouldn't claim "publish everywhere" until it can prove one real post end to end.

So we're starting smaller: one platform, one controlled X post, one verified audit trail.

OmniPost's first live campaign starts here.`
  ),
  createPost(
    'content_omnipost_x_002',
    'A scheduled badge is not proof',
    `Most social schedulers hide the risky part behind a green "Scheduled" badge.

OmniPost is being built around the opposite idea: a post is only done when the platform confirms it and the result is traceable.

First proving ground: X.`
  ),
  createPost(
    'content_omnipost_x_003',
    'Reliability before platform count',
    `We're building OmniPost for creators and small teams who want one publishing workflow without losing control of each channel.

The next milestone isn't "more platforms."

It's one reliable path, measured end to end. Then we expand.`
  ),
];

export const omnipostXCampaignSeed: Campaign = {
  id: OMNIPOST_X_CAMPAIGN_ID,
  name: 'OmniPost on X - First Live Campaign',
  description:
    'A controlled three-post campaign that proves OmniPost can publish to X and retain verifiable delivery evidence before expanding to more platforms.',
  status: 'draft',
  seriesIds: [],
  contentItems: omnipostXCampaignPosts,
  platforms: [
    {
      platformId: 'twitter',
      platformName: 'X',
      enabled: true,
      config: {
        postFrequency: 'custom',
        bestTimes: ['09:00', '12:00'],
        threadEnabled: false,
        maxPostLength: 280,
        defaultHashtags: [],
      },
    },
  ],
  schedule: {
    startDate: CREATED_AT,
    timezone: 'Africa/Johannesburg',
    posts: [],
  },
  metrics: {
    totalPosts: omnipostXCampaignPosts.length,
    publishedPosts: 0,
    scheduledPosts: 0,
    failedPosts: 0,
    totalEngagement: 0,
    platformMetrics: {},
  },
  createdAt: CREATED_AT,
  updatedAt: CREATED_AT,
  tags: ['omnipost', 'x', 'launch', 'controlled-live'],
};

export default omnipostXCampaignSeed;
