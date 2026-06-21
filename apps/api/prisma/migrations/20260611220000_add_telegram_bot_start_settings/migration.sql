CREATE TABLE "TelegramBotStartSettings" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "publicStartToken" TEXT NOT NULL,
  "welcomeMessageEnabled" BOOLEAN NOT NULL DEFAULT true,
  "welcomeMessage" TEXT,
  "showStripePlans" BOOLEAN NOT NULL DEFAULT false,
  "stripeConnectionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "showGroupsSummary" BOOLEAN NOT NULL DEFAULT false,
  "showSupportHint" BOOLEAN NOT NULL DEFAULT true,
  "supportHintText" TEXT,
  "showSubscribeSteps" BOOLEAN NOT NULL DEFAULT true,
  "showBotHelp" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TelegramBotStartSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TelegramBotStartSettings_userId_key" ON "TelegramBotStartSettings"("userId");
CREATE UNIQUE INDEX "TelegramBotStartSettings_publicStartToken_key" ON "TelegramBotStartSettings"("publicStartToken");
CREATE INDEX "TelegramBotStartSettings_publicStartToken_idx" ON "TelegramBotStartSettings"("publicStartToken");

ALTER TABLE "TelegramBotStartSettings"
  ADD CONSTRAINT "TelegramBotStartSettings_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
