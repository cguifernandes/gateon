-- DropIndex
DROP INDEX IF EXISTS "TelegramGroups_addedByTelegramUserId_idx";

-- AlterTable
ALTER TABLE "Accounts" DROP COLUMN IF EXISTS "accessToken",
DROP COLUMN IF EXISTS "refreshToken",
DROP COLUMN IF EXISTS "idToken",
DROP COLUMN IF EXISTS "accessTokenExpiresAt",
DROP COLUMN IF EXISTS "refreshTokenExpiresAt",
DROP COLUMN IF EXISTS "scope";

-- AlterTable
ALTER TABLE "TelegramGroups" DROP COLUMN IF EXISTS "addedByTelegramUserId";

-- AlterTable
ALTER TABLE "TelegramAlertRuns" DROP COLUMN IF EXISTS "error";

-- AlterTable
ALTER TABLE "StripeBillingSubscriptions" DROP COLUMN IF EXISTS "canceledAt";

-- AlterTable
ALTER TABLE "StripeBillingPayments" DROP COLUMN IF EXISTS "stripePaymentIntentId";

-- AlterTable
ALTER TABLE "StripeBillingProcessedWebhookEvents" DROP COLUMN IF EXISTS "stripeEventType";
