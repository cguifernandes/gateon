-- Allow multiple Stripe connections per user; one active connection per monitored plan.
DROP INDEX IF EXISTS "StripeBillingConnections_single_active_key_idx";
DROP INDEX IF EXISTS "StripeBillingConnections_userId_key";

CREATE UNIQUE INDEX "StripeBillingConnections_user_plan_active_idx"
ON "StripeBillingConnections" ("userId", "monitoredStripePriceId")
WHERE "status" = 'CONNECTED' AND "monitoredStripePriceId" IS NOT NULL;

CREATE INDEX "StripeBillingConnections_userId_monitoredStripePriceId_idx"
ON "StripeBillingConnections"("userId", "monitoredStripePriceId");
