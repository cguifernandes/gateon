-- CreateEnum
CREATE TYPE "AlertStatus" AS ENUM ('DRAFT', 'ACTIVE', 'SCHEDULED', 'PAUSED', 'FAILED');

-- CreateEnum
CREATE TYPE "AlertDestinationType" AS ENUM ('GROUP', 'TOPIC', 'MEMBERS', 'ALL_MEMBERS', 'AUTOMATION');

-- CreateEnum
CREATE TYPE "AlertScheduleType" AS ENUM ('IMMEDIATE', 'SCHEDULED', 'RECURRING');

-- CreateEnum
CREATE TYPE "AlertRecurrence" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AlertTriggerType" AS ENUM ('MEMBER_JOINED', 'MEMBER_INACTIVE', 'KEYWORD', 'SPAM_DETECTED', 'MEMBER_BANNED', 'GOAL_REACHED', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "AlertRunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'PARTIAL', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AlertDeliveryStatus" AS ENUM ('SENT', 'FAILED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "FloodRiskLevel" AS ENUM ('SAFE', 'MODERATE', 'HIGH');

-- CreateTable
CREATE TABLE "TelegramAlerts" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "telegramGroupId" TEXT,
  "name" TEXT NOT NULL,
  "internalTitle" TEXT,
  "status" "AlertStatus" NOT NULL DEFAULT 'DRAFT',
  "destinationType" "AlertDestinationType" NOT NULL,
  "messageThreadId" INTEGER,
  "scheduleType" "AlertScheduleType" NOT NULL DEFAULT 'IMMEDIATE',
  "scheduledAt" TIMESTAMP(3),
  "recurrence" "AlertRecurrence",
  "cronExpression" TEXT,
  "content" JSONB NOT NULL,
  "options" JSONB NOT NULL,
  "triggerType" "AlertTriggerType",
  "triggerConfig" JSONB,
  "floodRisk" "FloodRiskLevel" NOT NULL DEFAULT 'SAFE',
  "deliveryRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "lastRunAt" TIMESTAMP(3),
  "nextRunAt" TIMESTAMP(3),
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TelegramAlerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramAlertTargets" (
  "id" TEXT NOT NULL,
  "alertId" TEXT NOT NULL,
  "telegramUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TelegramAlertTargets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramAlertTemplates" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "content" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TelegramAlertTemplates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramAlertRuns" (
  "id" TEXT NOT NULL,
  "alertId" TEXT NOT NULL,
  "status" "AlertRunStatus" NOT NULL DEFAULT 'PENDING',
  "estimatedCount" INTEGER NOT NULL DEFAULT 0,
  "successCount" INTEGER NOT NULL DEFAULT 0,
  "failCount" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TelegramAlertRuns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramAlertDeliveries" (
  "id" TEXT NOT NULL,
  "runId" TEXT NOT NULL,
  "telegramUserId" TEXT,
  "chatId" TEXT,
  "threadId" INTEGER,
  "status" "AlertDeliveryStatus" NOT NULL,
  "error" TEXT,
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TelegramAlertDeliveries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TelegramAlerts_userId_status_idx" ON "TelegramAlerts"("userId", "status");

-- CreateIndex
CREATE INDEX "TelegramAlerts_telegramGroupId_idx" ON "TelegramAlerts"("telegramGroupId");

-- CreateIndex
CREATE INDEX "TelegramAlerts_nextRunAt_idx" ON "TelegramAlerts"("nextRunAt");

-- CreateIndex
CREATE INDEX "TelegramAlerts_destinationType_idx" ON "TelegramAlerts"("destinationType");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramAlertTargets_alertId_telegramUserId_key" ON "TelegramAlertTargets"("alertId", "telegramUserId");

-- CreateIndex
CREATE INDEX "TelegramAlertTargets_telegramUserId_idx" ON "TelegramAlertTargets"("telegramUserId");

-- CreateIndex
CREATE INDEX "TelegramAlertTemplates_userId_category_idx" ON "TelegramAlertTemplates"("userId", "category");

-- CreateIndex
CREATE INDEX "TelegramAlertRuns_alertId_createdAt_idx" ON "TelegramAlertRuns"("alertId", "createdAt");

-- CreateIndex
CREATE INDEX "TelegramAlertRuns_status_idx" ON "TelegramAlertRuns"("status");

-- CreateIndex
CREATE INDEX "TelegramAlertDeliveries_runId_status_idx" ON "TelegramAlertDeliveries"("runId", "status");

-- CreateIndex
CREATE INDEX "TelegramAlertDeliveries_telegramUserId_idx" ON "TelegramAlertDeliveries"("telegramUserId");

-- AddForeignKey
ALTER TABLE "TelegramAlerts" ADD CONSTRAINT "TelegramAlerts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramAlerts" ADD CONSTRAINT "TelegramAlerts_telegramGroupId_fkey" FOREIGN KEY ("telegramGroupId") REFERENCES "TelegramGroups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramAlertTargets" ADD CONSTRAINT "TelegramAlertTargets_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "TelegramAlerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramAlertTemplates" ADD CONSTRAINT "TelegramAlertTemplates_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramAlertRuns" ADD CONSTRAINT "TelegramAlertRuns_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "TelegramAlerts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramAlertDeliveries" ADD CONSTRAINT "TelegramAlertDeliveries_runId_fkey" FOREIGN KEY ("runId") REFERENCES "TelegramAlertRuns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
