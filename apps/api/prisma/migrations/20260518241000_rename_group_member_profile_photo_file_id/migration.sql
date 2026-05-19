-- Align naming with TelegramGroups chat photo (single file_id, not "small"-specific in schema).
ALTER TABLE "TelegramGroupMembers" RENAME COLUMN "profilePhotoSmallFileId" TO "profilePhotoFileId";
