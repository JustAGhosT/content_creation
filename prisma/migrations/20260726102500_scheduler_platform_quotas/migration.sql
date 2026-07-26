CREATE TABLE "SchedulerPlatformQuota" (
    "platformId" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowDuration" INTEGER NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "requestLimit" INTEGER NOT NULL,
    "dailyCount" INTEGER,
    "dailyLimit" INTEGER,
    "dailyResetAt" TIMESTAMP(3),
    "backoffUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchedulerPlatformQuota_pkey" PRIMARY KEY ("platformId")
);
