-- CreateTable
CREATE TABLE "StripeWebhookEvents" (
    "id" TEXT NOT NULL,
    "stripeEventId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeWebhookEvents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StripeWebhookEvents_stripeEventId_key" ON "StripeWebhookEvents"("stripeEventId");

-- CreateIndex
CREATE INDEX "StripeWebhookEvents_processedAt_idx" ON "StripeWebhookEvents"("processedAt");