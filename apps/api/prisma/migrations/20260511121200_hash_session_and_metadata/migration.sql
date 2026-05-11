-- Invalidate all active sessions to safely switch from raw token storage to hashed token storage.
DELETE FROM "Sessions";

-- DropIndex
DROP INDEX "Sessions_token_key";

-- AlterTable
ALTER TABLE "Sessions" DROP COLUMN "ipAddress",
DROP COLUMN "token",
DROP COLUMN "userAgent",
ADD COLUMN     "ipHash" TEXT,
ADD COLUMN     "metadataExpiresAt" TIMESTAMP(3),
ADD COLUMN     "tokenHash" TEXT NOT NULL,
ADD COLUMN     "userAgentHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Sessions_tokenHash_key" ON "Sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "Sessions_expiresAt_idx" ON "Sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "Sessions_metadataExpiresAt_idx" ON "Sessions"("metadataExpiresAt");
