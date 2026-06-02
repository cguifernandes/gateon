-- Expand automation trigger events supported by bot + API.
CREATE TYPE "AlertTriggerType_new" AS ENUM (
  'MEMBER_JOINED',
  'MEMBER_LEFT',
  'MEMBER_BANNED',
  'FORUM_TOPIC_CREATED'
);

ALTER TABLE "TelegramAlerts"
  ALTER COLUMN "triggerType" TYPE "AlertTriggerType_new"
  USING ("triggerType"::text::"AlertTriggerType_new");

DROP TYPE "AlertTriggerType";
ALTER TYPE "AlertTriggerType_new" RENAME TO "AlertTriggerType";
