-- When the bot first tracks a member (or they rejoin after leaving).
ALTER TABLE "TelegramGroupMembers" ADD COLUMN "joinedAt" TIMESTAMP(3);

UPDATE "TelegramGroupMembers"
SET "joinedAt" = "createdAt"
WHERE "joinedAt" IS NULL;

ALTER TABLE "TelegramGroupMembers"
ALTER COLUMN "joinedAt" SET NOT NULL,
ALTER COLUMN "joinedAt" SET DEFAULT CURRENT_TIMESTAMP;
