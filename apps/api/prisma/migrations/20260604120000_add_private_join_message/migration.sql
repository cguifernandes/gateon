ALTER TABLE "TelegramGroupBotSettings"
ADD COLUMN "privateJoinMessage" TEXT NOT NULL DEFAULT 'Olá, {name}! Seja bem-vindo(a). Estou por aqui se precisar de ajuda com o grupo.';
