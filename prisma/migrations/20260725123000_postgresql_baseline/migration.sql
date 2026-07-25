-- PostgreSQL baseline generated from prisma/schema.prisma.
-- The previous SQLite migration history is preserved in
-- prisma/migrations-sqlite-archive and is not executable against PostgreSQL.

CREATE SCHEMA IF NOT EXISTS "public";

CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "slug" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "source" TEXT NOT NULL DEFAULT 'user',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "seriesId" TEXT,
    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CampaignVersion" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" TEXT NOT NULL,
    "snapshotHash" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CampaignVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CampaignApproval" (
    "id" TEXT NOT NULL,
    "campaignVersionId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "variantId" TEXT,
    "state" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contentHash" TEXT NOT NULL,
    "notes" TEXT,
    CONSTRAINT "CampaignApproval_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AttributionLink" (
    "id" TEXT NOT NULL,
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AttributionLink_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AiGenerationRecord" (
    "id" TEXT NOT NULL,
    "campaignVersionId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "evidence" TEXT NOT NULL,
    "inputHash" TEXT NOT NULL,
    "outputHash" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AiGenerationRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PublishAttempt" (
    "id" TEXT NOT NULL,
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
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "PublishAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CampaignDecision" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "campaignVersionId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "evidence" TEXT,
    "decidedBy" TEXT NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CampaignDecision_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Content" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "contentType" TEXT NOT NULL DEFAULT 'post',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "campaignId" TEXT NOT NULL,
    CONSTRAINT "Content_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlatformAdaptation" (
    "id" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "adaptedContent" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "publishedUrl" TEXT,
    "publishedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "contentId" TEXT NOT NULL,
    CONSTRAINT "PlatformAdaptation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScheduledPost" (
    "id" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "publishedAt" TIMESTAMP(3),
    "error" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "campaignVersionId" TEXT,
    "approvedContentHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "campaignId" TEXT NOT NULL,
    CONSTRAINT "ScheduledPost_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Series" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Series_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "company" TEXT,
    "phone" TEXT,
    "source" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "score" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LeadInteraction" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leadId" TEXT NOT NULL,
    CONSTRAINT "LeadInteraction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "details" TEXT,
    "path" TEXT,
    "method" TEXT,
    "body" TEXT,
    "result" TEXT,
    "statusCode" INTEGER,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "subject" TEXT,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Form" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fields" TEXT NOT NULL,
    "settings" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Form_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "VideoJob" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "characterPrompt" TEXT NOT NULL,
    "motionVideoUrl" TEXT,
    "outputVideoUrl" TEXT,
    "platforms" TEXT NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 5,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "VideoJob_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FormSubmission" (
    "id" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "formId" TEXT NOT NULL,
    CONSTRAINT "FormSubmission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_username_key" ON "User"("username");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "Campaign_userId_idx" ON "Campaign"("userId");
CREATE INDEX "Campaign_status_idx" ON "Campaign"("status");
CREATE UNIQUE INDEX "Campaign_userId_externalId_key" ON "Campaign"("userId", "externalId");
CREATE UNIQUE INDEX "Campaign_userId_slug_key" ON "Campaign"("userId", "slug");
CREATE INDEX "CampaignVersion_campaignId_createdAt_idx" ON "CampaignVersion"("campaignId", "createdAt");
CREATE UNIQUE INDEX "CampaignVersion_campaignId_version_key" ON "CampaignVersion"("campaignId", "version");
CREATE UNIQUE INDEX "CampaignVersion_campaignId_snapshotHash_key" ON "CampaignVersion"("campaignId", "snapshotHash");
CREATE INDEX "CampaignApproval_campaignVersionId_contentId_idx" ON "CampaignApproval"("campaignVersionId", "contentId");
CREATE INDEX "CampaignApproval_reviewerId_reviewedAt_idx" ON "CampaignApproval"("reviewerId", "reviewedAt");
CREATE INDEX "AttributionLink_campaignId_idx" ON "AttributionLink"("campaignId");
CREATE UNIQUE INDEX "AttributionLink_campaignVersionId_variantId_key" ON "AttributionLink"("campaignVersionId", "variantId");
CREATE UNIQUE INDEX "AttributionLink_campaignId_trackingToken_key" ON "AttributionLink"("campaignId", "trackingToken");
CREATE INDEX "AiGenerationRecord_campaignVersionId_variantId_idx" ON "AiGenerationRecord"("campaignVersionId", "variantId");
CREATE INDEX "PublishAttempt_campaignId_requestedAt_idx" ON "PublishAttempt"("campaignId", "requestedAt");
CREATE INDEX "PublishAttempt_campaignVersionId_variantId_idx" ON "PublishAttempt"("campaignVersionId", "variantId");
CREATE INDEX "CampaignDecision_campaignId_decidedAt_idx" ON "CampaignDecision"("campaignId", "decidedAt");
CREATE INDEX "Content_campaignId_idx" ON "Content"("campaignId");
CREATE INDEX "PlatformAdaptation_contentId_idx" ON "PlatformAdaptation"("contentId");
CREATE INDEX "PlatformAdaptation_platformId_idx" ON "PlatformAdaptation"("platformId");
CREATE INDEX "ScheduledPost_campaignId_idx" ON "ScheduledPost"("campaignId");
CREATE INDEX "ScheduledPost_campaignVersionId_idx" ON "ScheduledPost"("campaignVersionId");
CREATE INDEX "ScheduledPost_status_idx" ON "ScheduledPost"("status");
CREATE INDEX "ScheduledPost_scheduledAt_idx" ON "ScheduledPost"("scheduledAt");
CREATE UNIQUE INDEX "Lead_email_key" ON "Lead"("email");
CREATE INDEX "Lead_email_idx" ON "Lead"("email");
CREATE INDEX "Lead_status_idx" ON "Lead"("status");
CREATE INDEX "LeadInteraction_leadId_idx" ON "LeadInteraction"("leadId");
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "Notification_type_idx" ON "Notification"("type");
CREATE INDEX "Notification_status_idx" ON "Notification"("status");
CREATE INDEX "Form_isActive_idx" ON "Form"("isActive");
CREATE UNIQUE INDEX "VideoJob_taskId_key" ON "VideoJob"("taskId");
CREATE INDEX "VideoJob_status_idx" ON "VideoJob"("status");
CREATE INDEX "VideoJob_createdAt_idx" ON "VideoJob"("createdAt");
CREATE INDEX "FormSubmission_formId_idx" ON "FormSubmission"("formId");

ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CampaignVersion" ADD CONSTRAINT "CampaignVersion_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignApproval" ADD CONSTRAINT "CampaignApproval_campaignVersionId_fkey" FOREIGN KEY ("campaignVersionId") REFERENCES "CampaignVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttributionLink" ADD CONSTRAINT "AttributionLink_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AttributionLink" ADD CONSTRAINT "AttributionLink_campaignVersionId_fkey" FOREIGN KEY ("campaignVersionId") REFERENCES "CampaignVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiGenerationRecord" ADD CONSTRAINT "AiGenerationRecord_campaignVersionId_fkey" FOREIGN KEY ("campaignVersionId") REFERENCES "CampaignVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PublishAttempt" ADD CONSTRAINT "PublishAttempt_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PublishAttempt" ADD CONSTRAINT "PublishAttempt_campaignVersionId_fkey" FOREIGN KEY ("campaignVersionId") REFERENCES "CampaignVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignDecision" ADD CONSTRAINT "CampaignDecision_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CampaignDecision" ADD CONSTRAINT "CampaignDecision_campaignVersionId_fkey" FOREIGN KEY ("campaignVersionId") REFERENCES "CampaignVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Content" ADD CONSTRAINT "Content_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlatformAdaptation" ADD CONSTRAINT "PlatformAdaptation_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScheduledPost" ADD CONSTRAINT "ScheduledPost_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScheduledPost" ADD CONSTRAINT "ScheduledPost_campaignVersionId_fkey" FOREIGN KEY ("campaignVersionId") REFERENCES "CampaignVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LeadInteraction" ADD CONSTRAINT "LeadInteraction_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FormSubmission" ADD CONSTRAINT "FormSubmission_formId_fkey" FOREIGN KEY ("formId") REFERENCES "Form"("id") ON DELETE CASCADE ON UPDATE CASCADE;
