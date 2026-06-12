-- Index declared in schema for lookups by user + monitored plan.
CREATE INDEX "StripeBillingConnections_userId_monitoredStripePriceId_idx"
ON "StripeBillingConnections"("userId", "monitoredStripePriceId");
