-- Soft-leave: members stay in DB with leftAt set when they exit the chat (tracked via chat_member updates).
ALTER TABLE "TelegramGroupMembers" ADD COLUMN "leftAt" TIMESTAMP(3);

CREATE INDEX "TelegramGroupMembers_telegramGroupId_leftAt_idx" ON "TelegramGroupMembers"("telegramGroupId", "leftAt");
