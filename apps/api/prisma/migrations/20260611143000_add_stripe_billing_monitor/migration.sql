-- Add Stripe billing monitor storage and automation triggers.
CREATE TYPE "AlertTriggerType_new" AS ENUM (
  'MEMBER_JOINED',
  'MEMBER_LEFT',
  'MEMBER_BANNED',
  'FORUM_TOPIC_CREATED',
  'MEMBER_JOINED_GROUP_MESSAGE',
  'MEMBER_LEFT_PRIVATE_MESSAGE',
  'STRIPE_PAYMENT_SUCCEEDED',
  'STRIPE_PAYMENT_FAILED',
  'STRIPE_SUBSCRIPTION_EXPIRING',
  'STRIPE_SUBSCRIPTION_EXPIRED',
  'STRIPE_SUBSCRIPTION_RENEWED',
  'STRIPE_SUBSCRIPTION_CANCELED'
);

ALTER TABLE "TelegramAlerts"
  ALTER COLUMN "triggerType" TYPE "AlertTriggerType_new"
  USING ("triggerType"::text::"AlertTriggerType_new");

DROP TYPE "AlertTriggerType";
ALTER TYPE "AlertTriggerType_new" RENAME TO "AlertTriggerType";

CREATE TYPE "StripeBillingConnectionStatus" AS ENUM (
  'CONNECTED',
  'DISCONNECTED',
  'FAILED'
);

CREATE TYPE "StripeBillingAuditAction" AS ENUM (
  'CONNECTION_CREATED',
  'CONNECTION_REMOVED',
  'CONSENT_ACCEPTED',
  'SYNC_EXECUTED',
  'PAYMENT_IDENTIFIED',
  'SUBSCRIPTION_EXPIRING',
  'SUBSCRIPTION_EXPIRED',
  'SUBSCRIPTION_CANCELED',
  'SUBSCRIPTION_RENEWED',
  'AUTOMATION_TRIGGERED'
);

CREATE TABLE "StripeBillingConnections" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "stripeAccountId" TEXT,
  "encryptedApiKey" TEXT NOT NULL,
  "apiKeyLast4" TEXT NOT NULL,
  "status" "StripeBillingConnectionStatus" NOT NULL DEFAULT 'CONNECTED',
  "lastSyncedAt" TIMESTAMP(3),
  "consentAcceptedAt" TIMESTAMP(3) NOT NULL,
  "disconnectedAt" TIMESTAMP(3),
  "activeSubscriptionCount" INTEGER NOT NULL DEFAULT 0,
  "expiringSubscriptionCount" INTEGER NOT NULL DEFAULT 0,
  "expiredSubscriptionCount" INTEGER NOT NULL DEFAULT 0,
  "customerCount" INTEGER NOT NULL DEFAULT 0,
  "monthlyRevenueCents" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StripeBillingConnections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StripeBillingCustomers" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "stripeCustomerId" TEXT NOT NULL,
  "name" TEXT,
  "email" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StripeBillingCustomers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StripeBillingSubscriptions" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "customerId" TEXT,
  "stripeSubscriptionId" TEXT NOT NULL,
  "stripeCustomerId" TEXT,
  "status" TEXT NOT NULL,
  "planName" TEXT,
  "currentPeriodEnd" TIMESTAMP(3),
  "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
  "canceledAt" TIMESTAMP(3),
  "lastEventType" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StripeBillingSubscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StripeBillingPayments" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "customerId" TEXT,
  "stripePaymentIntentId" TEXT,
  "stripeInvoiceId" TEXT,
  "stripeCustomerId" TEXT,
  "status" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL,
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StripeBillingPayments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StripeBillingAuditLogs" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "connectionId" TEXT,
  "action" "StripeBillingAuditAction" NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "StripeBillingAuditLogs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StripeBillingConnections_userId_key" ON "StripeBillingConnections"("userId");
CREATE INDEX "StripeBillingConnections_userId_status_idx" ON "StripeBillingConnections"("userId", "status");

CREATE UNIQUE INDEX "StripeBillingCustomers_connectionId_stripeCustomerId_key" ON "StripeBillingCustomers"("connectionId", "stripeCustomerId");
CREATE INDEX "StripeBillingCustomers_userId_idx" ON "StripeBillingCustomers"("userId");
CREATE INDEX "StripeBillingCustomers_email_idx" ON "StripeBillingCustomers"("email");

CREATE UNIQUE INDEX "StripeBillingSubscriptions_connectionId_stripeSubscriptionId_key" ON "StripeBillingSubscriptions"("connectionId", "stripeSubscriptionId");
CREATE INDEX "StripeBillingSubscriptions_userId_status_idx" ON "StripeBillingSubscriptions"("userId", "status");
CREATE INDEX "StripeBillingSubscriptions_connectionId_currentPeriodEnd_idx" ON "StripeBillingSubscriptions"("connectionId", "currentPeriodEnd");

CREATE UNIQUE INDEX "StripeBillingPayments_connectionId_stripeInvoiceId_key" ON "StripeBillingPayments"("connectionId", "stripeInvoiceId");
CREATE INDEX "StripeBillingPayments_userId_status_idx" ON "StripeBillingPayments"("userId", "status");
CREATE INDEX "StripeBillingPayments_connectionId_paidAt_idx" ON "StripeBillingPayments"("connectionId", "paidAt");

CREATE INDEX "StripeBillingAuditLogs_userId_action_idx" ON "StripeBillingAuditLogs"("userId", "action");
CREATE INDEX "StripeBillingAuditLogs_connectionId_createdAt_idx" ON "StripeBillingAuditLogs"("connectionId", "createdAt");

ALTER TABLE "StripeBillingConnections"
  ADD CONSTRAINT "StripeBillingConnections_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StripeBillingCustomers"
  ADD CONSTRAINT "StripeBillingCustomers_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StripeBillingCustomers"
  ADD CONSTRAINT "StripeBillingCustomers_connectionId_fkey"
  FOREIGN KEY ("connectionId") REFERENCES "StripeBillingConnections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StripeBillingSubscriptions"
  ADD CONSTRAINT "StripeBillingSubscriptions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StripeBillingSubscriptions"
  ADD CONSTRAINT "StripeBillingSubscriptions_connectionId_fkey"
  FOREIGN KEY ("connectionId") REFERENCES "StripeBillingConnections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StripeBillingSubscriptions"
  ADD CONSTRAINT "StripeBillingSubscriptions_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "StripeBillingCustomers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StripeBillingPayments"
  ADD CONSTRAINT "StripeBillingPayments_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StripeBillingPayments"
  ADD CONSTRAINT "StripeBillingPayments_connectionId_fkey"
  FOREIGN KEY ("connectionId") REFERENCES "StripeBillingConnections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StripeBillingPayments"
  ADD CONSTRAINT "StripeBillingPayments_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "StripeBillingCustomers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StripeBillingAuditLogs"
  ADD CONSTRAINT "StripeBillingAuditLogs_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StripeBillingAuditLogs"
  ADD CONSTRAINT "StripeBillingAuditLogs_connectionId_fkey"
  FOREIGN KEY ("connectionId") REFERENCES "StripeBillingConnections"("id") ON DELETE SET NULL ON UPDATE CASCADE;
