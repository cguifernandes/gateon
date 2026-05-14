import type { TelegramBotEventResult } from "./gateon-api.js";
import { replyForTelegramConnectionReason } from "./telegram-connection-replies.js";

const DEDUP_MS = 8_000;
const recent = new Map<string, number>();

export function tryConsumeGateonGroupNotifySlot(
  chatId: number | string,
  slotKey: string,
): boolean {
  const key = `${String(chatId)}:${slotKey}`;
  const now = Date.now();
  const prev = recent.get(key);
  if (prev !== undefined && now - prev < DEDUP_MS) {
    return false;
  }
  recent.set(key, now);

  const MAX_KEYS = 2_000;
  if (recent.size > MAX_KEYS) {
    const cutoff = now - DEDUP_MS;
    for (const [entry, ts] of recent) {
      if (ts < cutoff) {
        recent.delete(entry);
      }
    }
  }

  return true;
}

export function gateonGroupNotifySlotKey(
  result: TelegramBotEventResult,
): string | null {
  const reasonText = replyForTelegramConnectionReason(
    result.reason,
    result.missingRequiredRightIds,
  );
  if (reasonText) {
    const r = result.reason ?? "unknown";
    if (r === "bot_missing_required_admin_rights") {
      return `${r}:${[...(result.missingRequiredRightIds ?? [])].sort().join(",")}`;
    }
    return r;
  }
  if (result.status === "CONNECTED") {
    return "CONNECTED";
  }
  return null;
}
