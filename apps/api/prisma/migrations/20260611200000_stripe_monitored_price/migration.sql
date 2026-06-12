-- AlterTable
ALTER TABLE "StripeBillingConnections"
ADD COLUMN "monitoredStripePriceId" TEXT,
ADD COLUMN "monitoredStripeProductId" TEXT,
ADD COLUMN "monitoredPlanLabel" TEXT;
