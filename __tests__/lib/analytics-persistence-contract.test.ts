/** @jest-environment node */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { analyticsBatchSchema } from '@/lib/analytics/contracts';

describe('durable analytics persistence contract', () => {
  test('migration provides idempotency and tenant/campaign query indexes', () => {
    const migration = readFileSync(
      join(
        process.cwd(),
        'prisma',
        'migrations',
        '20260809090000_durable_analytics_events',
        'migration.sql'
      ),
      'utf8'
    );

    expect(migration).toContain('AnalyticsEventRecord_eventId_key');
    expect(migration).toContain('AnalyticsEventRecord_userId_campaignId_occurredAt_idx');
    expect(migration).toContain('AnalyticsEventRecord_campaignToken_occurredAt_idx');
    expect(migration).toContain('AttributionLink_trackingToken_key');
    expect(migration).toContain('Duplicate attribution tokens detected');
    expect(migration).not.toContain('SET "trackingToken"');
    expect(migration.indexOf('Duplicate attribution tokens detected')).toBeLessThan(
      migration.indexOf('CREATE TABLE "AnalyticsEventRecord"')
    );
  });

  test('rejects secret-bearing and unknown telemetry attributes', () => {
    expect(
      analyticsBatchSchema.safeParse({
        events: [
          {
            eventId: 'event:privacy:1',
            name: 'landing_view',
            properties: { authorization_header: 'Bearer secret' },
          },
        ],
      }).success
    ).toBe(false);
  });

  test('enforces event-specific properties and preserves post status', () => {
    expect(
      analyticsBatchSchema.safeParse({
        events: [
          {
            eventId: 'event:signup:1',
            name: 'signup_completed',
            properties: { campaignId: 'client-authored-campaign' },
          },
        ],
      }).success
    ).toBe(false);

    expect(
      analyticsBatchSchema.safeParse({
        events: [
          {
            eventId: 'event:post:1',
            name: 'post_created',
            properties: {
              platformCount: 1,
              platformNames: ['X'],
              status: 'queued',
            },
          },
        ],
      }).success
    ).toBe(true);
  });
});
