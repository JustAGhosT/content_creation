import { platformOperationalProfiles } from '@/lib/platforms/operational-profiles';

describe('platform operational profiles', () => {
  test('covers every platform shown in connection settings', () => {
    expect(Object.keys(platformOperationalProfiles).sort()).toEqual([
      'facebook',
      'instagram',
      'linkedin',
      'pinterest',
      'tiktok',
      'twitter',
    ]);
  });

  test('keeps the live X claim text-only and marks balance as provider-owned', () => {
    expect(platformOperationalProfiles.twitter).toMatchObject({
      messageTypes: ['text'],
      balanceSummary: 'Developer Console only',
      verifiedAt: '2026-07-28',
    });
  });

  test('describes only Pinterest fields wired through the scheduler adapter', () => {
    expect(platformOperationalProfiles.pinterest.contentLimit).toBe(
      'Image with title and description supported by the OmniPost sandbox adapter'
    );
    expect(platformOperationalProfiles.pinterest.contentLimit).not.toContain('link');
  });
});
