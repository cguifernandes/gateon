-- Drop per-admin snapshot table (replaced by single connector profile photo on TelegramGroups)
DROP TABLE IF EXISTS "TelegramGroupAdministrators";

-- Profile photo (Telegram file_id) for the Telegram user who connected the group
ALTER TABLE "TelegramGroups" ADD COLUMN IF NOT EXISTS "addedByProfilePhotoSmallFileId" TEXT;
