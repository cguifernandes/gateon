-- Bot start: optional group-first step before payment plan buttons
ALTER TABLE "TelegramBotStartSettings"
  ADD COLUMN "paymentButtonsGroupFirst" BOOLEAN NOT NULL DEFAULT false;
