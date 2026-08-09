import { afterEach, describe, expect, jest, test } from '@jest/globals';
import { getAdapter, PinterestSandboxAdapter, TwitterAdapter } from '../../lib/scheduler/adapters';
import type { PinterestSandboxClient } from '@/lib/platforms/pinterest/sandbox';
import { platformConfigurations, platforms } from '../../lib/config/platforms';

const originalNodeEnv = process.env.NODE_ENV;
const originalTikTokApiKey = platformConfigurations.tiktok.apiKey;
const originalTwitterApiUrl = platformConfigurations.twitter.apiUrl;
const originalTikTokPrivacyLevel = process.env.TIKTOK_PRIVACY_LEVEL;
const originalFetch = global.fetch;

function setNodeEnv(value: typeof process.env.NODE_ENV): void {
  Object.defineProperty(process.env, 'NODE_ENV', {
    value,
    configurable: true,
    writable: true,
  });
}

describe('Scheduler platform adapters', () => {
  afterEach(() => {
    setNodeEnv(originalNodeEnv);
    platformConfigurations.tiktok.apiKey = originalTikTokApiKey;
    platformConfigurations.twitter.apiUrl = originalTwitterApiUrl;
    if (originalTikTokPrivacyLevel === undefined) {
      delete process.env.TIKTOK_PRIVACY_LEVEL;
    } else {
      process.env.TIKTOK_PRIVACY_LEVEL = originalTikTokPrivacyLevel;
    }
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  test('registers TikTok with video-only publish constraints', () => {
    const adapter = getAdapter('tiktok');

    expect(adapter).toBeDefined();
    expect(adapter?.getMaxLength()).toBe(2200);
    expect(
      adapter?.validateContent({
        text: 'Short video caption',
      })
    ).toEqual(
      expect.objectContaining({
        valid: false,
        errors: expect.arrayContaining(['TikTok posts require a video URL']),
      })
    );
    expect(
      adapter?.validateContent({
        text: 'Short video caption',
        mediaUrls: ['https://cdn.example.com/video.mp4'],
      })
    ).toEqual(
      expect.objectContaining({
        valid: true,
      })
    );
  });

  test('production adapters fail closed when provider credentials are missing', async () => {
    setNodeEnv('production');
    delete process.env.FACEBOOK_API_KEY;

    await expect(
      getAdapter('facebook')?.publish({
        text: 'Production publish should not simulate without credentials',
      })
    ).rejects.toThrow('facebook API key is not configured');
  });

  test('provider-gated platforms are marked as coming soon', () => {
    const comingSoonSlugs = platforms
      .filter(platform => platform.comingSoon)
      .map(platform => platform.slug)
      .sort();

    expect(comingSoonSlugs).toEqual([
      'custom-channel',
      'facebook',
      'instagram',
      'linkedin',
      'pinterest',
      'tiktok',
    ]);
  });

  test('Pinterest Sandbox requires media and retains sandbox evidence', async () => {
    const createPin = jest.fn(async () => ({ id: 'pin-123' }));
    const adapter = new PinterestSandboxAdapter({ createPin } as unknown as PinterestSandboxClient);

    expect(adapter.validateContent({ text: 'Image-free Pin' })).toMatchObject({
      valid: false,
      errors: expect.arrayContaining(['Pinterest Sandbox posts require an image URL']),
    });

    await expect(
      adapter.publish({
        text: 'Sandbox-only Pin',
        mediaUrls: ['https://cdn.example.com/test.png'],
        hashtags: ['OmniPost'],
      })
    ).resolves.toEqual(
      expect.objectContaining({
        id: 'pin-123',
        url: 'https://www.pinterest.com/pin/pin-123/',
        platformData: { id: 'pin-123', environment: 'sandbox' },
      })
    );
    expect(createPin).toHaveBeenCalledWith({
      title: 'Sandbox-only Pin',
      description: 'Sandbox-only Pin\n\n#OmniPost',
      imageUrl: 'https://cdn.example.com/test.png',
    });
  });

  test('X publishes through the v2 create-post contract and returns an X URL', async () => {
    setNodeEnv('production');
    platformConfigurations.twitter.apiUrl = 'https://api.x.com/2/tweets';
    const resolveAccessToken = jest.fn(async () => 'x-user-access-token');
    const fetchMock = jest.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          id: 'post-123',
          text: 'Controlled live post',
        },
      }),
    } as Response);
    global.fetch = fetchMock;

    const result = await new TwitterAdapter(resolveAccessToken).publish(
      {
        text: 'Controlled live post',
      },
      { userId: 'user-1' }
    );

    expect(result).toEqual(
      expect.objectContaining({
        id: 'post-123',
        url: 'https://x.com/i/web/status/post-123',
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.x.com/2/tweets',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer x-user-access-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: 'Controlled live post',
        }),
      })
    );
    expect(resolveAccessToken).toHaveBeenCalledWith('user-1');
  });

  test('X fails closed without a tenant owner in production', async () => {
    setNodeEnv('production');
    const resolveAccessToken = jest.fn(async () => 'unused-token');

    await expect(
      new TwitterAdapter(resolveAccessToken).publish({ text: 'Do not publish without an owner' })
    ).rejects.toThrow('X account owner is required');
    expect(resolveAccessToken).not.toHaveBeenCalled();
  });

  test('X preserves HTTP status metadata for provider billing failures', async () => {
    setNodeEnv('production');
    const resolveAccessToken = jest.fn(async () => 'x-user-access-token');
    global.fetch = jest.fn<typeof fetch>().mockResolvedValue({
      ok: false,
      status: 402,
      statusText: 'Payment Required',
    } as Response);

    await expect(
      new TwitterAdapter(resolveAccessToken).publish(
        { text: 'Controlled live post' },
        { userId: 'user-1' }
      )
    ).rejects.toMatchObject({
      name: 'PlatformHttpError',
      response: { status: 402 },
    });
  });

  test('TikTok is excluded from the default text-only content flow', () => {
    const tiktok = platforms.find(platform => platform.slug === 'tiktok');

    expect(tiktok).toEqual(
      expect.objectContaining({
        comingSoon: true,
        defaultContentFlow: false,
        requiresMedia: true,
      })
    );
  });

  test('TikTok direct post sends privacy level and returns nested publish ID', async () => {
    setNodeEnv('production');
    process.env.TIKTOK_PRIVACY_LEVEL = 'SELF_ONLY';
    platformConfigurations.tiktok.apiKey = 'tiktok-token';
    const fetchMock = jest.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          publish_id: 'publish-123',
        },
        error: {
          code: 'ok',
          message: '',
        },
      }),
    } as Response);
    global.fetch = fetchMock;

    const result = await getAdapter('tiktok')?.publish({
      text: 'Video caption',
      mediaUrls: ['https://cdn.example.com/video.mp4'],
    });

    expect(result).toEqual(
      expect.objectContaining({
        id: 'publish-123',
        url: 'https://www.tiktok.com/upload?publish_id=publish-123',
      })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: JSON.stringify({
          post_info: {
            title: 'Video caption',
            privacy_level: 'SELF_ONLY',
          },
          source_info: {
            source: 'PULL_FROM_URL',
            video_url: 'https://cdn.example.com/video.mp4',
          },
        }),
      })
    );
  });
});
