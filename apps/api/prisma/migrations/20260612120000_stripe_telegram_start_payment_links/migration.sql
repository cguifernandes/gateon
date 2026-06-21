-- Bot start payment buttons + Stripe Telegram member linking
ALTER TABLE "TelegramBotStartSettings"
  ADD COLUMN "showPaymentButtons" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "paymentButtonConnectionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "paymentTargetGroupId" TEXT;

CREATE INDEX "TelegramBotStartSettings_paymentTargetGroupId_idx"
  ON "TelegramBotStartSettings"("paymentTargetGroupId");

ALTER TABLE "TelegramBotStartSettings"
  ADD CONSTRAINT "TelegramBotStartSettings_paymentTargetGroupId_fkey"
  FOREIGN KEY ("paymentTargetGroupId") REFERENCES "TelegramGroups"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TYPE "StripeTelegramCheckoutStatus" AS ENUM ('PENDING', 'COMPLETED', 'EXPIRED', 'FAILED');
CREATE TYPE "StripeTelegramMemberLinkStatus" AS ENUM ('ACTIVE', 'REVOKED');

ALTER TYPE "StripeBillingAuditAction" ADD VALUE 'TELEGRAM_MEMBER_LINKED';

CREATE TABLE "StripeTelegramCheckoutSessions" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "telegramUserId" TEXT NOT NULL,
  "telegramGroupId" TEXT,
  "stripeCheckoutSessionId" TEXT NOT NULL,
  "stripePriceId" TEXT NOT NULL,
  "status" "StripeTelegramCheckoutStatus" NOT NULL DEFAULT 'PENDING',
  "stripeCustomerId" TEXT,
  "stripeSubscriptionId" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "StripeTelegramCheckoutSessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StripeTelegramCheckoutSessions_stripeCheckoutSessionId_key"
  ON "StripeTelegramCheckoutSessions"("stripeCheckoutSessionId");
CREATE INDEX "StripeTelegramCheckoutSessions_userId_telegramUserId_idx"
  ON "StripeTelegramCheckoutSessions"("userId", "telegramUserId");
CREATE INDEX "StripeTelegramCheckoutSessions_connectionId_status_idx"
  ON "StripeTelegramCheckoutSessions"("connectionId", "status");

ALTER TABLE "StripeTelegramCheckoutSessions"
  ADD CONSTRAINT "StripeTelegramCheckoutSessions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StripeTelegramCheckoutSessions"
  ADD CONSTRAINT "StripeTelegramCheckoutSessions_connectionId_fkey"
  FOREIGN KEY ("connectionId") REFERENCES "StripeBillingConnections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StripeTelegramCheckoutSessions"
  ADD CONSTRAINT "StripeTelegramCheckoutSessions_telegramGroupId_fkey"
  FOREIGN KEY ("telegramGroupId") REFERENCES "TelegramGroups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "StripeTelegramMemberLinks" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "telegramGroupId" TEXT NOT NULL,
  "telegramUserId" TEXT NOT NULL,
  "stripeCustomerId" TEXT NOT NULL,
  "stripeSubscriptionId" TEXT,
  "status" "StripeTelegramMemberLinkStatus" NOT NULL DEFAULT 'ACTIVE',
  "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "StripeTelegramMemberLinks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StripeTelegramMemberLinks_connectionId_telegramUserId_key"
  ON "StripeTelegramMemberLinks"("connectionId", "telegramUserId");
CREATE INDEX "StripeTelegramMemberLinks_userId_telegramGroupId_idx"
  ON "StripeTelegramMemberLinks"("userId", "telegramGroupId");
CREATE INDEX "StripeTelegramMemberLinks_stripeCustomerId_idx"
  ON "StripeTelegramMemberLinks"("stripeCustomerId");
CREATE INDEX "StripeTelegramMemberLinks_telegramUserId_status_idx"
  ON "StripeTelegramMemberLinks"("telegramUserId", "status");

ALTER TABLE "StripeTelegramMemberLinks"
  ADD CONSTRAINT "StripeTelegramMemberLinks_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StripeTelegramMemberLinks"
  ADD CONSTRAINT "StripeTelegramMemberLinks_connectionId_fkey"
  FOREIGN KEY ("connectionId") REFERENCES "StripeBillingConnections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StripeTelegramMemberLinks"
  ADD CONSTRAINT "StripeTelegramMemberLinks_telegramGroupId_fkey"
  FOREIGN KEY ("telegramGroupId") REFERENCES "TelegramGroups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
