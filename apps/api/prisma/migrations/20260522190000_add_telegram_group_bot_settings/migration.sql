CREATE TABLE "TelegramGroupBotSettings" (
    "id" TEXT NOT NULL,
    "telegramGroupId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "welcomeEnabled" BOOLEAN NOT NULL DEFAULT false,
    "welcomeMessage" TEXT NOT NULL DEFAULT 'Bem-vindo, {name}! Sua entrada no grupo foi registrada com sucesso.',
    "privateMessageOnJoin" BOOLEAN NOT NULL DEFAULT false,
    "notifyPermissionLoss" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramGroupBotSettings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TelegramGroupBotSettings_telegramGroupId_key" ON "TelegramGroupBotSettings"("telegramGroupId");
CREATE INDEX "TelegramGroupBotSettings_telegramGroupId_idx" ON "TelegramGroupBotSettings"("telegramGroupId");

ALTER TABLE "TelegramGroupBotSettings"
ADD CONSTRAINT "TelegramGroupBotSettings_telegramGroupId_fkey"
FOREIGN KEY ("telegramGroupId") REFERENCES "TelegramGroups"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
