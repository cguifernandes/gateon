-- AlterTable: add canceledAt column to StripeBillingSubscriptions
ALTER TABLE "StripeBillingSubscriptions" ADD COLUMN IF NOT EXISTS "canceledAt" TIMESTAMP(3);