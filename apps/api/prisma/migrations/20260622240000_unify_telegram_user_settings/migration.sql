-- Unify TelegramBotStartSettings + TelegramGroupsAutomationSettings into TelegramUserSettings

ALTER TABLE "TelegramBotStartSettings"
ADD COLUMN IF NOT EXISTS "autoRemoveExpiredSubscribers" BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
  IF to_regclass('public."TelegramGroupsAutomationSettings"') IS NOT NULL THEN
    UPDATE "TelegramBotStartSettings" AS t
    SET "autoRemoveExpiredSubscribers" = g."autoRemoveExpiredSubscribers"
    FROM "TelegramGroupsAutomationSettings" AS g
    WHERE t."userId" = g."userId";

    DROP TABLE "TelegramGroupsAutomationSettings";
  END IF;
END $$;

ALTER TABLE "TelegramBotStartSettings" RENAME TO "TelegramUserSettings";

ALTER INDEX IF EXISTS "TelegramBotStartSettings_pkey" RENAME TO "TelegramUserSettings_pkey";
ALTER INDEX IF EXISTS "TelegramBotStartSettings_userId_key" RENAME TO "TelegramUserSettings_userId_key";
ALTER INDEX IF EXISTS "TelegramBotStartSettings_publicStartToken_key" RENAME TO "TelegramUserSettings_publicStartToken_key";
ALTER INDEX IF EXISTS "TelegramBotStartSettings_publicStartToken_idx" RENAME TO "TelegramUserSettings_publicStartToken_idx";

ALTER TABLE "TelegramUserSettings"
RENAME CONSTRAINT "TelegramBotStartSettings_userId_fkey" TO "TelegramUserSettings_userId_fkey";
