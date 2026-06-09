import type { AppConfig } from "../config.js";

export type GroupBotSettings = {
  enabled: boolean;
  notifyPermissionLoss: boolean;
};

type GroupSettingsResponse =
  | {
      connected: true;
      group: {
        id: string;
        telegramChatId: string;
        title?: string | null;
      };
      settings: GroupBotSettings;
    }
  | {
      connected: false;
      settings: null;
    };

const CACHE_TTL_MS = 30_000;
const cache = new Map<
  string,
  { expiresAt: number; value: GroupSettingsResponse }
>();

export async function fetchGroupSettings(
  config: AppConfig,
  telegramChatId: string | number,
): Promise<GroupSettingsResponse> {
  const chatId = String(telegramChatId).trim();
  const cached = cache.get(chatId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const response = await fetch(
    `${config.GATEON_API_BASE_URL}/telegram/internal/groups/${encodeURIComponent(chatId)}/bot-settings`,
    {
      method: "GET",
      headers: {
        "x-gateon-bot-secret": config.TELEGRAM_BOT_INTERNAL_SECRET,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Gateon settings request failed (${response.status})`);
  }

  const value = (await response.json()) as GroupSettingsResponse;
  cache.set(chatId, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}
