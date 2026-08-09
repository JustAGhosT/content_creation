/** @jest-environment node */

jest.mock('@/lib/campaigns/repository', () => ({
  saveCampaignVersion: jest.fn(),
  recordAttributionLinks: jest.fn(),
}));

import { importCanonicalXCampaign } from '@/lib/campaigns/import-canonical';
import { recordAttributionLinks, saveCampaignVersion } from '@/lib/campaigns/repository';

describe('canonical campaign import', () => {
  test('returns the generated server-owned attribution links', async () => {
    const persisted = {
      id: 'campaign-row-1',
      externalId: 'campaign_omnipost_x_live_001',
      version: 1,
    };
    const generatedLinks = [
      {
        id: 'link-1',
        contentId: 'content_omnipost_x_001',
        variantId: 'variant_omnipost_x_001',
        trackingToken: 'mtk_generated_server_token',
      },
    ];
    jest.mocked(saveCampaignVersion).mockResolvedValue(persisted as never);
    jest.mocked(recordAttributionLinks).mockResolvedValue(generatedLinks as never);

    await expect(importCanonicalXCampaign('user-1')).resolves.toEqual({
      ...persisted,
      attributionLinks: generatedLinks,
    });
    expect(recordAttributionLinks).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', version: 1 })
    );
  });
});
