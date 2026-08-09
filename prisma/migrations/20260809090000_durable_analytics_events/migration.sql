-- CreateTable
CREATE TABLE "AnalyticsEventRecord" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT,
    "campaignId" TEXT,
    "campaignVersion" INTEGER,
    "contentId" TEXT,
    "variantId" TEXT,
    "platform" TEXT,
    "publishAttemptId" TEXT,
    "providerPostId" TEXT,
    "campaignToken" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "utmContent" TEXT,
    "landingPage" TEXT,
    "properties" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEventRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsEventRecord_eventId_key" ON "AnalyticsEventRecord"("eventId");
CREATE INDEX "AnalyticsEventRecord_userId_occurredAt_idx" ON "AnalyticsEventRecord"("userId", "occurredAt");
CREATE INDEX "AnalyticsEventRecord_userId_campaignId_occurredAt_idx" ON "AnalyticsEventRecord"("userId", "campaignId", "occurredAt");
CREATE INDEX "AnalyticsEventRecord_campaignToken_occurredAt_idx" ON "AnalyticsEventRecord"("campaignToken", "occurredAt");
CREATE INDEX "AnalyticsEventRecord_name_occurredAt_idx" ON "AnalyticsEventRecord"("name", "occurredAt");

-- AddForeignKey
ALTER TABLE "AnalyticsEventRecord" ADD CONSTRAINT "AnalyticsEventRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Public attribution tokens must identify exactly one campaign globally.
-- Existing duplicates may already be embedded in distributed URLs, so changing
-- either row here would silently reattribute traffic. Fail closed and require
-- affected links to be regenerated before applying this migration.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "AttributionLink"
        GROUP BY "trackingToken"
        HAVING COUNT(*) > 1
    ) THEN
        RAISE EXCEPTION 'Duplicate attribution tokens detected; regenerate affected campaign links before migration';
    END IF;
END $$;

DROP INDEX IF EXISTS "AttributionLink_campaignId_trackingToken_key";
CREATE UNIQUE INDEX "AttributionLink_trackingToken_key" ON "AttributionLink"("trackingToken");
