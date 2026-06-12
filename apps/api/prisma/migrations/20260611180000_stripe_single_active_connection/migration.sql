-- Enforce a single CONNECTED Stripe key across the platform.
CREATE UNIQUE INDEX "StripeBillingConnections_single_active_key_idx"
ON "StripeBillingConnections" ((1))
WHERE "status" = 'CONNECTED';
