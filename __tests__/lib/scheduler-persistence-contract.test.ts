import { readFileSync } from 'node:fs';
import path from 'node:path';

describe('scheduler persistence migration', () => {
  test('creates a forward-only tenant-owned queue with idempotency and lease indexes', () => {
    const migration = readFileSync(
      path.join(
        process.cwd(),
        'prisma',
        'migrations',
        '20260726080500_scheduler_jobs',
        'migration.sql'
      ),
      'utf8'
    );

    expect(migration).toContain('CREATE TABLE "SchedulerJob"');
    expect(migration).toContain('SchedulerJob_userId_idempotencyKey_key');
    expect(migration).toContain('"requestFingerprint" TEXT NOT NULL');
    expect(migration).toContain('SchedulerJob_status_scheduledAt_idx');
    expect(migration).toContain('SchedulerJob_leaseExpiresAt_idx');
    expect(migration).toContain('REFERENCES "User"("id")');
    expect(migration).toContain('PublishAttempt_schedulerJobId_key');
    expect(migration).toContain('ON DELETE SET NULL ON UPDATE CASCADE');
    expect(migration).not.toContain('DROP TABLE');
  });

  test('creates shared PostgreSQL scheduler quota state', () => {
    const migration = readFileSync(
      path.join(
        process.cwd(),
        'prisma',
        'migrations',
        '20260726102500_scheduler_platform_quotas',
        'migration.sql'
      ),
      'utf8'
    );

    expect(migration).toContain('CREATE TABLE "SchedulerPlatformQuota"');
    expect(migration).toContain('"platformId" TEXT NOT NULL');
    expect(migration).not.toContain('DROP TABLE');
  });
});
