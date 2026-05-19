-- AlterTable
ALTER TABLE "TelegramGroups" ADD COLUMN     "description" TEXT,
ADD COLUMN     "chatPhotoSmallFileId" TEXT,
ADD COLUMN     "chatPhotoBigFileId" TEXT;

-- CreateTable
CREATE TABLE "TelegramGroupAdministrators" (
    "id" TEXT NOT NULL,
    "telegramGroupId" TEXT NOT NULL,
    "telegramUserId" TEXT NOT NULL,
    "username" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "adminStatus" TEXT NOT NULL,
    "profilePhotoSmallFileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramGroupAdministrators_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TelegramGroupAdministrators_telegramGroupId_telegramUserId_key" ON "TelegramGroupAdministrators"("telegramGroupId", "telegramUserId");

-- CreateIndex
CREATE INDEX "TelegramGroupAdministrators_telegramGroupId_idx" ON "TelegramGroupAdministrators"("telegramGroupId");

-- AddForeignKey
ALTER TABLE "TelegramGroupAdministrators" ADD CONSTRAINT "TelegramGroupAdministrators_telegramGroupId_fkey" FOREIGN KEY ("telegramGroupId") REFERENCES "TelegramGroups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
