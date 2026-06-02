-- Revert legacy QUICK_ALERT records to MEMBERS (cast avoids enum value requirement).
UPDATE "TelegramAlerts"
SET "destinationType" = 'MEMBERS'
WHERE "destinationType"::text = 'QUICK_ALERT';

-- Keep only supported destination types.
CREATE TYPE "AlertDestinationType_new" AS ENUM (
  'GROUP',
  'TOPIC',
  'MEMBERS',
  'AUTOMATION'
);

ALTER TABLE "TelegramAlerts"
  ALTER COLUMN "destinationType" TYPE "AlertDestinationType_new"
  USING ("destinationType"::text::"AlertDestinationType_new");

DROP TYPE "AlertDestinationType";
ALTER TYPE "AlertDestinationType_new" RENAME TO "AlertDestinationType";

-- Keep only currently supported automation trigger.
UPDATE "TelegramAlerts"
SET "triggerType" = NULL
WHERE "triggerType" IS NOT NULL
  AND "triggerType" <> 'MEMBER_JOINED';

CREATE TYPE "AlertTriggerType_new" AS ENUM ('MEMBER_JOINED');

ALTER TABLE "TelegramAlerts"
  ALTER COLUMN "triggerType" TYPE "AlertTriggerType_new"
  USING ("triggerType"::text::"AlertTriggerType_new");

DROP TYPE "AlertTriggerType";
ALTER TYPE "AlertTriggerType_new" RENAME TO "AlertTriggerType";
