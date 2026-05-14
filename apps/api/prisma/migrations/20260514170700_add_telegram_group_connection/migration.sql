-- CreateEnum
CREATE TYPE "TelegramConnectionStatus" AS ENUM ('PENDING', 'TELEGRAM_USER_CONFIRMED', 'WAITING_FOR_PERMISSIONS', 'CONNECTED', 'EXPIRED', 'FAILED');

-- CreateTable
CREATE TABLE "TelegramAccounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "telegramUserId" TEXT NOT NULL,
    "username" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramAccounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramGroupConnectionIntents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "TelegramConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "telegramUserId" TEXT,
    "telegramChatId" TEXT,
    "telegramChatTitle" TEXT,
    "telegramChatType" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramGroupConnectionIntents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramGroups" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "telegramChatId" TEXT NOT NULL,
    "title" TEXT,
    "type" TEXT NOT NULL,
    "addedByTelegramUserId" TEXT NOT NULL,
    "botStatus" TEXT NOT NULL,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramGroups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TelegramAccounts_telegramUserId_key" ON "TelegramAccounts"("telegramUserId");

-- CreateIndex
CREATE INDEX "TelegramAccounts_userId_idx" ON "TelegramAccounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramGroupConnectionIntents_tokenHash_key" ON "TelegramGroupConnectionIntents"("tokenHash");

-- CreateIndex
CREATE INDEX "TelegramGroupConnectionIntents_userId_status_idx" ON "TelegramGroupConnectionIntents"("userId", "status");

-- CreateIndex
CREATE INDEX "TelegramGroupConnectionIntents_telegramUserId_status_idx" ON "TelegramGroupConnectionIntents"("telegramUserId", "status");

-- CreateIndex
CREATE INDEX "TelegramGroupConnectionIntents_expiresAt_idx" ON "TelegramGroupConnectionIntents"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramGroups_telegramChatId_key" ON "TelegramGroups"("telegramChatId");

-- CreateIndex
CREATE INDEX "TelegramGroups_userId_idx" ON "TelegramGroups"("userId");

-- CreateIndex
CREATE INDEX "TelegramGroups_addedByTelegramUserId_idx" ON "TelegramGroups"("addedByTelegramUserId");

-- AddForeignKey
ALTER TABLE "TelegramAccounts" ADD CONSTRAINT "TelegramAccounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramGroupConnectionIntents" ADD CONSTRAINT "TelegramGroupConnectionIntents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramGroups" ADD CONSTRAINT "TelegramGroups_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
