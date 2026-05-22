import type { TelegramGroupSummaryDto } from "@/lib/zod/telegram-group-connection-schemas";

export function memberMatchesSearch(
  members: TelegramGroupSummaryDto["members"],
  q: string,
) {
  if (!q) return false;
  return members.some((m) => {
    const hay = [m.firstName, m.lastName, m.telegramUserId]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
  }).format(new Date(value));
}

export function getTrackedMembersProgressPercent(
  tracked: number,
  limit: number,
): number {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((tracked / limit) * 100));
}
