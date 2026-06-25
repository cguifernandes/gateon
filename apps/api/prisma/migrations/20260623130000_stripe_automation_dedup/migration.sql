ALTER TABLE "StripeBillingSubscriptions"
ADD COLUMN IF NOT EXISTS "lastAutomationDedupeKey" TEXT;

ALTER TABLE "StripeBillingPayments"
ADD COLUMN IF NOT EXISTS "lastAutomationDedupeKey" TEXT;

CREATE TABLE IF NOT EXISTS "StripeBillingProcessedWebhookEvents" (
  "id" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "stripeEventId" TEXT NOT NULL,
  "stripeEventType" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "StripeBillingProcessedWebhookEvents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StripeBillingProcessedWebhookEvents_connectionId_stripeEventId_key"
  ON "StripeBillingProcessedWebhookEvents"("connectionId", "stripeEventId");

CREATE INDEX IF NOT EXISTS "StripeBillingProcessedWebhookEvents_connectionId_createdAt_idx"
  ON "StripeBillingProcessedWebhookEvents"("connectionId", "createdAt");

ALTER TABLE "StripeBillingProcessedWebhookEvents"
  ADD CONSTRAINT "StripeBillingProcessedWebhookEvents_connectionId_fkey"
  FOREIGN KEY ("connectionId") REFERENCES "StripeBillingConnections"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
