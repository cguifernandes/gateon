-- Unify group chat photo into a single Telegram file_id (prefer small, fallback big in data migration).
ALTER TABLE "TelegramGroups" ADD COLUMN "chatPhotoFileId" TEXT;

UPDATE "TelegramGroups"
SET "chatPhotoFileId" = COALESCE("chatPhotoSmallFileId", "chatPhotoBigFileId")
WHERE "chatPhotoSmallFileId" IS NOT NULL OR "chatPhotoBigFileId" IS NOT NULL;

ALTER TABLE "TelegramGroups" DROP COLUMN "chatPhotoSmallFileId";
ALTER TABLE "TelegramGroups" DROP COLUMN "chatPhotoBigFileId";
