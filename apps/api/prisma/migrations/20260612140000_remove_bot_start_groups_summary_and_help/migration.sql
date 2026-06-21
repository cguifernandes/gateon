-- Drop removed /start settings columns
ALTER TABLE "TelegramBotStartSettings"
  DROP COLUMN IF EXISTS "showGroupsSummary",
  DROP COLUMN IF EXISTS "showBotHelp";
