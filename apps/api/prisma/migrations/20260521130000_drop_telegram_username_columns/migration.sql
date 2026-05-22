-- Drop optional Telegram @username fields; display uses first/last name only.
ALTER TABLE "TelegramAccounts" DROP COLUMN IF EXISTS "username";
ALTER TABLE "TelegramGroupMembers" DROP COLUMN IF EXISTS "username";
