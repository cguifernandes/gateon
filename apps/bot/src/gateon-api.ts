import type { AlertTriggerType } from "./alert-triggers.js";
import type { BotStartPublicPayload } from "./bot-start-message-builder.js";
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
    }
  | {
      eventType: "forum_topic_upsert";
      chatId: string;
      messageThreadId: number;
      name?: string;
      iconColor?: number;
      isClosed?: boolean;
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

export class GateonApiError extends Error {
  readonly status: number;
  readonly apiMessage: string;

  constructor(status: number, apiMessage: string) {
    super(`Gateon API rejected Telegram event (${status}): ${apiMessage}`);
    this.name = "GateonApiError";
    this.status = status;
    this.apiMessage = apiMessage;
  }
}

function readGateonApiErrorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === "object") {
    if (
      "message" in body &&
      typeof (body as { message?: unknown }).message === "string"
    ) {
      return (body as { message: string }).message;
    }
    if (
      "error" in body &&
      typeof (body as { error?: unknown }).error === "string"
    ) {
      return (body as { error: string }).error;
    }
  }

  return fallback;
}

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
    let parsedBody: unknown = null;
    try {
      parsedBody = detail ? JSON.parse(detail) : null;
    } catch {
      parsedBody = null;
    }

    throw new GateonApiError(
      response.status,
      readGateonApiErrorMessage(
        parsedBody,
        detail.trim() || "Não foi possível concluir a operação.",
      ),
    );
  }

  return (await response.json()) as TelegramBotEventResult;
}

export async function fetchBotStartPublicSettings(
  config: AppConfig,
  token: string,
): Promise<BotStartPublicPayload | null> {
  const response = await fetch(
    `${config.GATEON_API_BASE_URL}/telegram/internal/bot-start/public/${encodeURIComponent(token)}`,
    {
      method: "GET",
      headers: {
        "x-gateon-bot-secret": config.TELEGRAM_BOT_INTERNAL_SECRET,
      },
    },
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Gateon API rejected bot start settings (${response.status}): ${detail}`,
    );
  }

  return (await response.json()) as BotStartPublicPayload;
}

export type BotStartCheckoutButton = {
  connectionId: string;
  label: string;
  url: string;
};

export type BotStartPaymentGroup = {
  id: string;
  title: string;
};

export async function fetchBotStartCheckoutButtons(
  config: AppConfig,
  input: {
    token: string;
    telegramUserId: string;
    telegramGroupId?: string;
  },
): Promise<{ buttons: BotStartCheckoutButton[] }> {
  const response = await fetch(
    `${config.GATEON_API_BASE_URL}/telegram/internal/bot-start/checkout-buttons`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-gateon-bot-secret": config.TELEGRAM_BOT_INTERNAL_SECRET,
      },
      body: JSON.stringify(input),
    },
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Gateon API rejected bot start checkout buttons (${response.status}): ${detail}`,
    );
  }

  return (await response.json()) as { buttons: BotStartCheckoutButton[] };
}

export async function fetchBotStartPaymentGroups(
  config: AppConfig,
  input: { token: string },
): Promise<{ groups: BotStartPaymentGroup[] }> {
  const response = await fetch(
    `${config.GATEON_API_BASE_URL}/telegram/internal/bot-start/payment-groups`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-gateon-bot-secret": config.TELEGRAM_BOT_INTERNAL_SECRET,
      },
      body: JSON.stringify(input),
    },
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `Gateon API rejected bot start payment groups (${response.status}): ${detail}`,
    );
  }

  return (await response.json()) as { groups: BotStartPaymentGroup[] };
}

export type SubscriptionCancelPortalOption = {
  url: string;
  label: string;
};

export async function fetchSubscriptionCancelPortal(
  config: AppConfig,
  telegramUserId: string,
): Promise<{ options: SubscriptionCancelPortalOption[] }> {
  const response = await fetch(
    `${config.GATEON_API_BASE_URL}/telegram/internal/bot-start/cancel-portal`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-gateon-bot-secret": config.TELEGRAM_BOT_INTERNAL_SECRET,
      },
      body: JSON.stringify({ telegramUserId }),
    },
  );

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      readGateonApiErrorMessage(
        body,
        "Não foi possível abrir o portal de cancelamento.",
      ),
    );
  }

  return body as { options: SubscriptionCancelPortalOption[] };
}

export async function triggerTelegramAlerts(
  config: AppConfig,
  event: {
    triggerType: AlertTriggerType;
    chatId: string;
    telegramUserId?: string;
    telegramUserDisplayName?: string;
    messageThreadId?: number;
  },
): Promise<void> {
  const response = await fetch(
    `${config.GATEON_API_BASE_URL}/alerts/internal/trigger`,
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
      `Gateon API rejected alert trigger (${response.status}): ${detail}`,
    );
  }
}
