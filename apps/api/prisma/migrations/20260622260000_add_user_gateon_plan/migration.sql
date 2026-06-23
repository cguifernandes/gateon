-- CreateEnum
CREATE TYPE "GateonPlanId" AS ENUM ('free', 'starter', 'pro');

-- AlterTable
ALTER TABLE "Users" ADD COLUMN "planId" "GateonPlanId" NOT NULL DEFAULT 'free';
