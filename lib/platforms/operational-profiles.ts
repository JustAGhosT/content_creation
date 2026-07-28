export interface PlatformOperationalProfile {
  messageTypes: string[];
  contentLimit: string;
  accessModel: string;
  testSurface: string;
  costSummary: string[];
  quotaSummary: string;
  balanceSummary: string;
  referenceUrl: string;
  referenceLabel: string;
  verifiedAt: string;
}

/**
 * Public provider facts shown in Settings. These are deliberately descriptive
 * rather than a promise of live balance data. Provider pricing and policies can
 * change, so each profile links to the source and carries a verification date.
 */
export const platformOperationalProfiles: Record<string, PlatformOperationalProfile> = {
  facebook: {
    messageTypes: ['text', 'image', 'video'],
    contentLimit: '63,206 character OmniPost adapter limit',
    accessModel: 'Planned — Meta app review and Page permissions required',
    testSurface: 'Meta development roles and test assets; public visibility still needs review',
    costSummary: ['No OmniPost per-post fee', 'Provider costs are not reported to OmniPost'],
    quotaSummary: 'Provider quotas and response headers; no balance integration yet',
    balanceSummary: 'Not available in OmniPost',
    referenceUrl: 'https://developers.facebook.com/docs/pages-api/posts/',
    referenceLabel: 'Meta Pages API',
    verifiedAt: '2026-07-28',
  },
  instagram: {
    messageTypes: ['image', 'video'],
    contentLimit: '2,200 character caption; media required',
    accessModel: 'Planned — Meta app review and professional account required',
    testSurface: 'Meta development roles and test assets; public visibility still needs review',
    costSummary: ['No OmniPost per-post fee', 'Provider costs are not reported to OmniPost'],
    quotaSummary: 'Provider publishing quota; no balance integration yet',
    balanceSummary: 'Not available in OmniPost',
    referenceUrl: 'https://developers.facebook.com/docs/instagram-platform/content-publishing/',
    referenceLabel: 'Instagram publishing',
    verifiedAt: '2026-07-28',
  },
  linkedin: {
    messageTypes: ['text', 'image', 'article'],
    contentLimit: '3,000 character OmniPost adapter limit',
    accessModel: 'Planned — Community Management access is vetted',
    testSurface: 'Development tier plus manually created LinkedIn test profiles',
    costSummary: ['No OmniPost per-post fee', 'No public per-post API price'],
    quotaSummary: 'Development tier: 500 app requests/day and 100 member requests/day',
    balanceSummary: 'No credit balance model',
    referenceUrl:
      'https://learn.microsoft.com/linkedin/marketing/community-management/community-management-overview',
    referenceLabel: 'LinkedIn Community Management',
    verifiedAt: '2026-07-28',
  },
  twitter: {
    messageTypes: ['text'],
    contentLimit: '280 characters; current live path is text-only',
    accessModel: 'Live — OAuth user-context publishing',
    testSurface: 'X API Playground for local no-credit contract tests; no public post',
    costSummary: ['$0.015 text post', '$0.200 post containing a URL'],
    quotaSummary: 'Pay per use; consumption API exists, exact credit balance does not',
    balanceSummary: 'Developer Console only',
    referenceUrl: 'https://docs.x.com/x-api/getting-started/pricing',
    referenceLabel: 'X pricing and credits',
    verifiedAt: '2026-07-28',
  },
  tiktok: {
    messageTypes: ['video'],
    contentLimit: '2,200 character caption; media required',
    accessModel: 'Planned — unaudited clients are private-only',
    testSurface: 'Unaudited private-only posting, subject to TikTok user and creator caps',
    costSummary: ['No OmniPost per-post fee', 'No public per-post API price'],
    quotaSummary: '6 publish-init requests/minute; creator caps vary (typically about 15/day)',
    balanceSummary: 'No credit balance model',
    referenceUrl: 'https://developers.tiktok.com/doc/content-sharing-guidelines/',
    referenceLabel: 'TikTok posting guidelines',
    verifiedAt: '2026-07-28',
  },
};
