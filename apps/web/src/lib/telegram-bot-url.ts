const DEFAULT_TELEGRAM_BOT_USERNAME = "GateonBot";

export function normalizeTelegramBotUsername(
  username: string | null | undefined,
): string {
  const normalized = username?.replace(/^@/, "").trim();
  return normalized || DEFAULT_TELEGRAM_BOT_USERNAME;
}

export function buildTelegramBotPublicUrl(
  username?: string | null,
): string {
  return `https://t.me/${normalizeTelegramBotUsername(username)}`;
}

export function getPublicTelegramBotUrlFromEnv(): string {
  return buildTelegramBotPublicUrl(
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME,
  );
}
