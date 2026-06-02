-- Normalize legacy scheduled rows before enum/column cleanup
UPDATE "TelegramAlerts" SET "status" = 'ACTIVE' WHERE "status" = 'SCHEDULED';

DROP INDEX IF EXISTS "TelegramAlerts_nextRunAt_idx";

ALTER TABLE "TelegramAlerts"
  DROP COLUMN "scheduleType",
  DROP COLUMN "scheduledAt",
  DROP COLUMN "recurrence",
  DROP COLUMN "cronExpression",
  DROP COLUMN "nextRunAt";

DROP TYPE "AlertScheduleType";
DROP TYPE "AlertRecurrence";

CREATE TYPE "AlertStatus_new" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'FAILED');

ALTER TABLE "TelegramAlerts" ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "TelegramAlerts"
  ALTER COLUMN "status" TYPE "AlertStatus_new"
  USING ("status"::text::"AlertStatus_new");

ALTER TABLE "TelegramAlerts"
  ALTER COLUMN "status" SET DEFAULT 'DRAFT'::"AlertStatus_new";

DROP TYPE "AlertStatus";

ALTER TYPE "AlertStatus_new" RENAME TO "AlertStatus";
