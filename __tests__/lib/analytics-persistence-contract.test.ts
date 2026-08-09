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
});
