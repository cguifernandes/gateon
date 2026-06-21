-- Per-plan Stripe payment group targets (connectionId -> telegramGroupId)
ALTER TABLE "TelegramBotStartSettings"
  ADD COLUMN "paymentPlanGroupTargets" JSONB NOT NULL DEFAULT '{}'::jsonb;

UPDATE "TelegramBotStartSettings"
SET "paymentPlanGroupTargets" = (
  SELECT COALESCE(
    jsonb_object_agg(connection_id, "paymentTargetGroupId"),
    '{}'::jsonb
  )
  FROM unnest("paymentButtonConnectionIds") AS connection_id
  WHERE "paymentTargetGroupId" IS NOT NULL
    AND cardinality("paymentButtonConnectionIds") > 0
);

ALTER TABLE "TelegramBotStartSettings" DROP CONSTRAINT IF EXISTS "TelegramBotStartSettings_paymentTargetGroupId_fkey";
DROP INDEX IF EXISTS "TelegramBotStartSettings_paymentTargetGroupId_idx";
ALTER TABLE "TelegramBotStartSettings" DROP COLUMN "paymentTargetGroupId";
