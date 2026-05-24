import type { AppConfig } from "../config.js";
import { fetchGroupSettings, type GroupBotSettings } from "./fetch-group-settings.js";

export async function getActiveGroupBotSettings(
  config: AppConfig,
  telegramChatId: string | number,
): Promise<GroupBotSettings | null> {
  const result = await fetchGroupSettings(config, telegramChatId);
  if (!result.connected || !result.settings.enabled) {
    return null;
  }

  return result.settings;
}
