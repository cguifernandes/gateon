-- Link Stripe billing connections to Telegram groups (moved from bot-start settings)
ALTER TABLE "StripeBillingConnections"
  ADD COLUMN "telegramGroupId" TEXT;

ALTER TABLE "StripeBillingConnections"
  ADD CONSTRAINT "StripeBillingConnections_telegramGroupId_fkey"
  FOREIGN KEY ("telegramGroupId") REFERENCES "TelegramGroups"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "StripeBillingConnections_userId_telegramGroupId_idx"
  ON "StripeBillingConnections"("userId", "telegramGroupId");

-- Migrate existing per-plan targets from bot-start settings into connections
UPDATE "StripeBillingConnections" AS conn
SET "telegramGroupId" = targets.group_id
FROM (
  SELECT
    s."userId" AS user_id,
    connection_id,
    (s."paymentPlanGroupTargets" ->> connection_id) AS group_id
  FROM "TelegramBotStartSettings" AS s
  CROSS JOIN LATERAL unnest(s."paymentButtonConnectionIds") AS connection_id
  WHERE s."paymentPlanGroupTargets" IS NOT NULL
    AND s."paymentPlanGroupTargets"::text <> '{}'
    AND (s."paymentPlanGroupTargets" ->> connection_id) IS NOT NULL
) AS targets
WHERE conn."userId" = targets.user_id
  AND conn.id = targets.connection_id
  AND conn."telegramGroupId" IS NULL;

ALTER TABLE "TelegramBotStartSettings" DROP COLUMN "paymentPlanGroupTargets";
