-- Add a tenant-owned durable scheduler queue with idempotency and bounded leases.
CREATE TABLE "SchedulerJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "requestFingerprint" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "campaignId" TEXT,
    "campaignVersion" INTEGER,
    "campaignVersionId" TEXT,
    "approvedContentHash" TEXT,
    "variantId" TEXT,
    "contentId" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "lastAttemptAt" TIMESTAMP(3),
    "nextRetryAt" TIMESTAMP(3),
    "leaseToken" TEXT,
    "leaseExpiresAt" TIMESTAMP(3),
    "attemptStartedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "publishedUrl" TEXT,
    "platformPostId" TEXT,
    "errorCode" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SchedulerJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SchedulerJob_userId_idempotencyKey_key"
    ON "SchedulerJob"("userId", "idempotencyKey");
CREATE INDEX "SchedulerJob_userId_status_idx"
    ON "SchedulerJob"("userId", "status");
CREATE INDEX "SchedulerJob_status_scheduledAt_idx"
    ON "SchedulerJob"("status", "scheduledAt");
CREATE INDEX "SchedulerJob_status_nextRetryAt_idx"
    ON "SchedulerJob"("status", "nextRetryAt");
CREATE INDEX "SchedulerJob_leaseExpiresAt_idx"
    ON "SchedulerJob"("leaseExpiresAt");
CREATE INDEX "SchedulerJob_campaignId_idx"
    ON "SchedulerJob"("campaignId");
CREATE INDEX "SchedulerJob_campaignVersionId_idx"
    ON "SchedulerJob"("campaignVersionId");

ALTER TABLE "SchedulerJob"
    ADD CONSTRAINT "SchedulerJob_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SchedulerJob"
    ADD CONSTRAINT "SchedulerJob_campaignVersionId_fkey"
    FOREIGN KEY ("campaignVersionId") REFERENCES "CampaignVersion"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PublishAttempt" ADD COLUMN "schedulerJobId" TEXT;
CREATE UNIQUE INDEX "PublishAttempt_schedulerJobId_key"
    ON "PublishAttempt"("schedulerJobId");
ALTER TABLE "PublishAttempt"
    ADD CONSTRAINT "PublishAttempt_schedulerJobId_fkey"
    FOREIGN KEY ("schedulerJobId") REFERENCES "SchedulerJob"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
