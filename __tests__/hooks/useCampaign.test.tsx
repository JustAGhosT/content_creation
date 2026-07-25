import { renderHook, waitFor } from '@testing-library/react';
import { useCampaign } from '@/hooks/useCampaign';
import { aerospaceCampaignSeed } from '@/lib/seed/aerospace-campaign';
import { omnipostXCampaignSeed } from '@/lib/seed/omnipost-x-campaign';
import type { Campaign } from '@/types/campaign';

function envelope(campaign: Campaign, version = 1) {
  return {
    campaign,
    version,
    versionId: `version-${campaign.id}-${version}`,
    snapshotHash: `sha256:${'a'.repeat(64)}`,
    contentHashes: {},
  };
}

function jsonResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  } as Response;
}

describe('useCampaign server persistence', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    localStorage.clear();
    jest.restoreAllMocks();
  });

  test('hydrates from the API and migrates legacy browser campaigns once', async () => {
    localStorage.setItem('content-campaigns', JSON.stringify([aerospaceCampaignSeed]));
    const fetchMock = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValueOnce(jsonResponse(envelope(omnipostXCampaignSeed), 201))
      .mockResolvedValueOnce(jsonResponse({ campaigns: [envelope(omnipostXCampaignSeed)] }))
      .mockResolvedValueOnce(jsonResponse(envelope(aerospaceCampaignSeed), 201));
    globalThis.fetch = fetchMock;

    const { result, unmount } = renderHook(() => useCampaign());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.campaigns.map(campaign => campaign.id).sort()).toEqual(
      [omnipostXCampaignSeed.id, aerospaceCampaignSeed.id].sort()
    );
    expect(localStorage.getItem('content-campaigns')).toBeNull();
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/campaigns/import',
      expect.objectContaining({ method: 'POST' })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/campaigns', expect.any(Object));
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/campaigns',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"source":"browser-import"'),
      })
    );

    unmount();
  });
});
