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
    const legacyCampaign = JSON.parse(JSON.stringify(aerospaceCampaignSeed)) as {
      contentItems: Array<{ adaptations: Array<{ variantId?: string }> }>;
    };
    delete legacyCampaign.contentItems[0].adaptations[0].variantId;
    localStorage.setItem('content-campaigns', JSON.stringify([legacyCampaign]));
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
      expect.objectContaining({ method: 'POST' })
    );
    const importInit = fetchMock.mock.calls[2][1];
    const importPayload = JSON.parse(String(importInit?.body)) as {
      campaign: Campaign;
      source: string;
    };
    expect(importPayload.source).toBe('browser-import');
    expect(importPayload.campaign.contentItems[0].adaptations[0].variantId).toMatch(/^legacy-0-/);

    unmount();
  });

  test('keeps a failed legacy import visible and recoverable', async () => {
    localStorage.setItem('content-campaigns', JSON.stringify([aerospaceCampaignSeed]));
    const fetchMock = jest
      .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
      .mockResolvedValueOnce(jsonResponse(envelope(omnipostXCampaignSeed), 201))
      .mockResolvedValueOnce(jsonResponse({ campaigns: [envelope(omnipostXCampaignSeed)] }))
      .mockResolvedValueOnce(jsonResponse({ message: 'Import failed' }, 400));
    globalThis.fetch = fetchMock;

    const { result, unmount } = renderHook(() => useCampaign());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.campaigns.map(campaign => campaign.id)).toContain(
      aerospaceCampaignSeed.id
    );
    expect(result.current.error).toBe(
      'Some browser campaigns could not be imported; local copies remain.'
    );
    expect(localStorage.getItem('content-campaigns')).not.toBeNull();

    unmount();
  });
});
