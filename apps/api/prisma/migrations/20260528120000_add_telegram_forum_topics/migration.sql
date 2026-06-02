-- CreateTable
CREATE TABLE "TelegramForumTopics" (
    "id" TEXT NOT NULL,
    "telegramGroupId" TEXT NOT NULL,
    "messageThreadId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "iconColor" INTEGER,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramForumTopics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TelegramForumTopics_telegramGroupId_messageThreadId_key" ON "TelegramForumTopics"("telegramGroupId", "messageThreadId");

-- CreateIndex
CREATE INDEX "TelegramForumTopics_telegramGroupId_idx" ON "TelegramForumTopics"("telegramGroupId");

-- AddForeignKey
ALTER TABLE "TelegramForumTopics" ADD CONSTRAINT "TelegramForumTopics_telegramGroupId_fkey" FOREIGN KEY ("telegramGroupId") REFERENCES "TelegramGroups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
