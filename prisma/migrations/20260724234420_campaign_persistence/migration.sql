-- CreateTable
CREATE TABLE "CampaignVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" TEXT NOT NULL,
    "snapshotHash" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CampaignVersion_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CampaignApproval" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignVersionId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "variantId" TEXT,
    "state" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "reviewedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contentHash" TEXT NOT NULL,
    "notes" TEXT,
    CONSTRAINT "CampaignApproval_campaignVersionId_fkey" FOREIGN KEY ("campaignVersionId") REFERENCES "CampaignVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AttributionLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "campaignVersionId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "trackingToken" TEXT NOT NULL,
    "utmId" TEXT NOT NULL,
    "utmSource" TEXT NOT NULL,
    "utmMedium" TEXT NOT NULL,
    "utmCampaign" TEXT NOT NULL,
    "utmContent" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AttributionLink_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AttributionLink_campaignVersionId_fkey" FOREIGN KEY ("campaignVersionId") REFERENCES "CampaignVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AiGenerationRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignVersionId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "evidence" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "outputHash" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    CONSTRAINT "AiGenerationRecord_campaignVersionId_fkey" FOREIGN KEY ("campaignVersionId") REFERENCES "CampaignVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PublishAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "campaignVersionId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'requested',
    "providerPostId" TEXT,
    "providerPostUrl" TEXT,
    "auditEventId" TEXT,
    "errorCode" TEXT,
    "requestedBy" TEXT NOT NULL,
    "requestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "PublishAttempt_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PublishAttempt_campaignVersionId_fkey" FOREIGN KEY ("campaignVersionId") REFERENCES "CampaignVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CampaignDecision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "campaignId" TEXT NOT NULL,
    "campaignVersionId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "evidence" TEXT,
    "decidedBy" TEXT NOT NULL,
    "decidedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CampaignDecision_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CampaignDecision_campaignVersionId_fkey" FOREIGN KEY ("campaignVersionId") REFERENCES "CampaignVersion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Campaign" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalId" TEXT,
    "slug" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "source" TEXT NOT NULL DEFAULT 'user',
    "startDate" DATETIME,
    "endDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" TEXT NOT NULL,
    "seriesId" TEXT,
    CONSTRAINT "Campaign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Campaign_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Campaign" ("createdAt", "description", "endDate", "id", "name", "seriesId", "startDate", "status", "updatedAt", "userId") SELECT "createdAt", "description", "endDate", "id", "name", "seriesId", "startDate", "status", "updatedAt", "userId" FROM "Campaign";
DROP TABLE "Campaign";
ALTER TABLE "new_Campaign" RENAME TO "Campaign";
CREATE INDEX "Campaign_userId_idx" ON "Campaign"("userId");
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");
CREATE UNIQUE INDEX "Campaign_userId_externalId_key" ON "Campaign"("userId", "externalId");
CREATE UNIQUE INDEX "Campaign_userId_slug_key" ON "Campaign"("userId", "slug");
CREATE TABLE "new_ScheduledPost" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "platformId" TEXT NOT NULL,
    "scheduledAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "publishedAt" DATETIME,
    "error" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "campaignVersionId" TEXT,
    "approvedContentHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "campaignId" TEXT NOT NULL,
    CONSTRAINT "ScheduledPost_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ScheduledPost_campaignVersionId_fkey" FOREIGN KEY ("campaignVersionId") REFERENCES "CampaignVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ScheduledPost" ("campaignId", "createdAt", "error", "id", "platformId", "publishedAt", "retryCount", "scheduledAt", "status", "updatedAt") SELECT "campaignId", "createdAt", "error", "id", "platformId", "publishedAt", "retryCount", "scheduledAt", "status", "updatedAt" FROM "ScheduledPost";
DROP TABLE "ScheduledPost";
ALTER TABLE "new_ScheduledPost" RENAME TO "ScheduledPost";
CREATE INDEX "ScheduledPost_campaignId_idx" ON "ScheduledPost"("campaignId");
CREATE INDEX "ScheduledPost_campaignVersionId_idx" ON "ScheduledPost"("campaignVersionId");
CREATE INDEX "ScheduledPost_status_idx" ON "ScheduledPost"("status");
CREATE INDEX "ScheduledPost_scheduledAt_idx" ON "ScheduledPost"("scheduledAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "CampaignVersion_campaignId_createdAt_idx" ON "CampaignVersion"("campaignId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignVersion_campaignId_version_key" ON "CampaignVersion"("campaignId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignVersion_campaignId_snapshotHash_key" ON "CampaignVersion"("campaignId", "snapshotHash");

-- CreateIndex
CREATE INDEX "CampaignApproval_campaignVersionId_contentId_idx" ON "CampaignApproval"("campaignVersionId", "contentId");

-- CreateIndex
CREATE INDEX "CampaignApproval_reviewerId_reviewedAt_idx" ON "CampaignApproval"("reviewerId", "reviewedAt");

-- CreateIndex
CREATE INDEX "AttributionLink_campaignId_idx" ON "AttributionLink"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "AttributionLink_campaignId_trackingToken_key" ON "AttributionLink"("campaignId", "trackingToken");

-- CreateIndex
CREATE UNIQUE INDEX "AttributionLink_campaignVersionId_variantId_key" ON "AttributionLink"("campaignVersionId", "variantId");

-- CreateIndex
CREATE INDEX "AiGenerationRecord_campaignVersionId_variantId_idx" ON "AiGenerationRecord"("campaignVersionId", "variantId");

-- CreateIndex
CREATE INDEX "PublishAttempt_campaignId_requestedAt_idx" ON "PublishAttempt"("campaignId", "requestedAt");

-- CreateIndex
CREATE INDEX "PublishAttempt_campaignVersionId_variantId_idx" ON "PublishAttempt"("campaignVersionId", "variantId");

-- CreateIndex
CREATE INDEX "CampaignDecision_campaignId_decidedAt_idx" ON "CampaignDecision"("campaignId", "decidedAt");
