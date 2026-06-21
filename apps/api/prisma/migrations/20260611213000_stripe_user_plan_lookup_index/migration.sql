-- Index already created in 20260611210000_stripe_multi_key_per_plan; keep IF NOT EXISTS for clean replay.
CREATE INDEX IF NOT EXISTS "StripeBillingConnections_userId_monitoredStripePriceId_idx"
ON "StripeBillingConnections"("userId", "monitoredStripePriceId");
