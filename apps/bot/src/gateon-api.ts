import type { AppConfig } from "./config.js";

type TelegramUserPayload = {
  id: string;
  firstName?: string;
  lastName?: string;
};

type TelegramChatPayload = {
  id: string;
  title?: string;
  type: string;
};

type TelegramAdministratorRightsPayload = {
  canManageChat: boolean;
  canRestrictMembers: boolean;
  canInviteUsers: boolean;
};

type TelegramBotEvent =
  | {
      eventType: "private_start";
      token: string;
      telegramUser: TelegramUserPayload;
    }
  | {
      eventType: "group_start";
      token: string;
      telegramUser: TelegramUserPayload;
      chat: TelegramChatPayload;
      botStatus: string;
      administratorRights?: TelegramAdministratorRightsPayload;
    }
  | {
      eventType: "bot_chat_member";
      telegramUser: TelegramUserPayload;
      chat: TelegramChatPayload;
      botStatus: string;
      administratorRights?: TelegramAdministratorRightsPayload;
    }
  | {
      eventType: "chat_member";
      chat: TelegramChatPayload;
      subjectUser: TelegramUserPayload & { isBot?: boolean };
      newMemberStatus: string;
    }
  | {
      eventType: "chat_migrated";
      oldChatId: string;
      newChatId: string;
      title?: string;
    }
  | {
      eventType: "chat_forum_updated";
      chatId: string;
      isForum: boolean;
      title?: string;
    };

export type TelegramBotEventResult = {
  status: string;
  intentId?: string;
  startGroupUrl?: string;
  reason?: string;
  missingRequiredRightIds?: string[];
  group?: {
    id: string;
    telegramChatId: string;
    title?: string;
    type: string;
  };
};

export async function sendTelegramBotEvent(
  config: AppConfig,
  event: TelegramBotEvent,
): Promise<TelegramBotEventResult> {
  const response = await fetch(
    `${config.GATEON_API_BASE_URL}/telegram/group-connections/events`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-gateon-bot-secret": config.TELEGRAM_BOT_INTERNAL_SECRET,
      },
      body: JSON.stringify(event),
    },
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Gateon API rejected Telegram event (${response.status}): ${detail}`,
    );
  }

  return (await response.json()) as TelegramBotEventResult;
}
