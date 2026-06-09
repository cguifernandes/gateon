-- Repair drift: TelegramAlertTemplates was removed from the live database
-- while migration history still expects it to exist.

CREATE TABLE IF NOT EXISTS "TelegramAlertTemplates" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramAlertTemplates_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TelegramAlertTemplates_userId_category_idx"
ON "TelegramAlertTemplates"("userId", "category");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'TelegramAlertTemplates_userId_fkey'
  ) THEN
    ALTER TABLE "TelegramAlertTemplates"
    ADD CONSTRAINT "TelegramAlertTemplates_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "Users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
