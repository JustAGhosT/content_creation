import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  campaignContentHash,
  campaignSnapshotSchema,
  sha256,
  stableStringify,
} from '@/lib/campaigns/contracts';
import { omnipostXCampaignSeed } from '@/lib/seed/omnipost-x-campaign';

describe('campaign persistence contracts', () => {
  test('produces deterministic hashes independent of object key order', () => {
    expect(stableStringify({ b: 2, a: 1 })).toBe(stableStringify({ a: 1, b: 2 }));
    expect(sha256({ b: 2, a: 1 })).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(sha256({ b: 2, a: 1 })).toBe(sha256({ a: 1, b: 2 }));
  });

  test('binds content hashes to stable adaptation IDs and content', () => {
    const content = omnipostXCampaignSeed.contentItems[0];
    const original = campaignContentHash(content);
    const changedVariant = {
      ...content,
      adaptations: [
        {
          ...content.adaptations[0],
          variantId: 'variant_changed',
        },
      ],
    };

    expect(original).not.toBe(campaignContentHash(changedVariant));
  });

  test('sanitizes external campaign text and preserves canonical variant IDs', () => {
    const campaign = JSON.parse(
      JSON.stringify(omnipostXCampaignSeed)
    ) as typeof omnipostXCampaignSeed;
    campaign.name = '<script>alert(1)</script>Safe name';

    const parsed = campaignSnapshotSchema.parse(campaign);

    expect(parsed.name).not.toContain('<script>');
    expect(parsed.contentItems.map(item => item.adaptations[0].variantId)).toEqual([
      'variant_omnipost_x_001',
      'variant_omnipost_x_002',
      'variant_omnipost_x_003',
    ]);
  });

  test('PostgreSQL baseline preserves campaign history and legacy users', () => {
    const migration = readFileSync(
      path.join(
        process.cwd(),
        'prisma',
        'migrations',
        '20260725123000_postgresql_baseline',
        'migration.sql'
      ),
      'utf8'
    );

    expect(migration).not.toContain('DROP TABLE "User"');
    expect(migration).toContain('CREATE TABLE "User"');
    expect(migration).toContain('CREATE TABLE "CampaignVersion"');
    expect(migration).toContain('AttributionLink_campaignId_trackingToken_key');
  });
});
