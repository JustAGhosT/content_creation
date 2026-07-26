-- Persist external provider subjects before issuing application sessions.
CREATE TABLE "ExternalIdentity" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExternalIdentity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExternalIdentity_provider_externalId_key"
    ON "ExternalIdentity"("provider", "externalId");
CREATE INDEX "ExternalIdentity_userId_idx"
    ON "ExternalIdentity"("userId");

ALTER TABLE "ExternalIdentity"
    ADD CONSTRAINT "ExternalIdentity_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
