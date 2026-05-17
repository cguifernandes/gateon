/** Per-user cache tag for Telegram groups list (invalidate after connect/remove). */
export function telegramGroupsCacheTag(userId: string) {
  return `telegram-groups:${userId}`;
}
