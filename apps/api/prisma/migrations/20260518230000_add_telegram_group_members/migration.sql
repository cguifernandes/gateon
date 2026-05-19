-- CreateTable
CREATE TABLE "TelegramGroupMembers" (
    "id" TEXT NOT NULL,
    "telegramGroupId" TEXT NOT NULL,
    "telegramUserId" TEXT NOT NULL,
    "username" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "profilePhotoSmallFileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramGroupMembers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TelegramGroupMembers_telegramGroupId_telegramUserId_key" ON "TelegramGroupMembers"("telegramGroupId", "telegramUserId");

-- CreateIndex
CREATE INDEX "TelegramGroupMembers_telegramGroupId_idx" ON "TelegramGroupMembers"("telegramGroupId");

-- AddForeignKey
ALTER TABLE "TelegramGroupMembers" ADD CONSTRAINT "TelegramGroupMembers_telegramGroupId_fkey" FOREIGN KEY ("telegramGroupId") REFERENCES "TelegramGroups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
