-- Persist tenant-owned OAuth credentials encrypted by the application.
CREATE TABLE "PlatformAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "providerUsername" TEXT,
    "encryptedAccessToken" TEXT NOT NULL,
    "encryptedRefreshToken" TEXT,
    "tokenType" TEXT NOT NULL DEFAULT 'bearer',
    "scopes" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'connected',
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "refreshedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PlatformAccount_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlatformAccount_userId_platform_key"
    ON "PlatformAccount"("userId", "platform");
CREATE UNIQUE INDEX "PlatformAccount_platform_providerAccountId_key"
    ON "PlatformAccount"("platform", "providerAccountId");
CREATE INDEX "PlatformAccount_userId_status_idx"
    ON "PlatformAccount"("userId", "status");
CREATE INDEX "PlatformAccount_platform_status_idx"
    ON "PlatformAccount"("platform", "status");

ALTER TABLE "PlatformAccount"
    ADD CONSTRAINT "PlatformAccount_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
