import { withCacheBuster } from "@/lib/utils";
import type { AlertDeliveryRecordDto } from "@/lib/zod/alert-schemas";
import type { TelegramGroupSummaryDto } from "@/lib/zod/telegram-group-connection-schemas";

export type AlertRunFailureGroup = {
  id: string;
  kind: "group" | "member";
  name: string;
  imageSrc: string | null;
  imageAlt: string;
  imageUpdatedAt?: string;
  error: string;
};

export function buildAlertRunFailureGroups(
  deliveries: AlertDeliveryRecordDto[],
  groups: TelegramGroupSummaryDto[],
): AlertRunFailureGroup[] {
  const grouped = new Map<string, AlertRunFailureGroup>();
  const groupsByChatId = new Map(
    groups.map((group) => [group.telegramChatId, group] as const),
  );

  for (const delivery of deliveries) {
    if (delivery.status !== "FAILED" || !delivery.error?.trim()) {
      continue;
    }

    if (delivery.telegramUserId) {
      const id = `member:${delivery.telegramUserId}`;
      const existing = grouped.get(id);
      if (existing) {
        if (!existing.error.includes(delivery.error)) {
          existing.error = `${existing.error}\n${delivery.error}`;
        }
        continue;
      }

      grouped.set(id, {
        id,
        kind: "member",
        name: `Membro ${delivery.telegramUserId}`,
        imageSrc: null,
        imageAlt: delivery.telegramUserId,
        error: delivery.error,
      });
      continue;
    }

    if (!delivery.chatId) {
      continue;
    }

    const threadSuffix =
      delivery.threadId != null ? `:thread:${delivery.threadId}` : "";
    const id = `chat:${delivery.chatId}${threadSuffix}`;
    const group = groupsByChatId.get(delivery.chatId);
    const title = group?.title?.trim() || `Grupo ${delivery.chatId}`;
    const name =
      delivery.threadId != null
        ? `${title} · tópico #${delivery.threadId}`
        : title;

    const existing = grouped.get(id);
    if (existing) {
      if (!existing.error.includes(delivery.error)) {
        existing.error = `${existing.error}\n${delivery.error}`;
      }
      continue;
    }

    grouped.set(id, {
      id,
      kind: "group",
      name,
      imageSrc: group?.chatPhotoUrl
        ? withCacheBuster(group.chatPhotoUrl, group.updatedAt)
        : null,
      imageAlt: title,
      imageUpdatedAt: group?.updatedAt,
      error: delivery.error,
    });
  }

  return [...grouped.values()];
}
