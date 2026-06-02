import type { Bot, Context } from "grammy";
import type { AppConfig } from "../config.js";
import { sendTelegramBotEvent, triggerTelegramAlerts } from "../gateon-api.js";

/** Avoid spamming the API on every message; sync only when is_forum changes. */
const lastForumStatusByChatId = new Map<string, boolean>();

async function notifyChatForumUpdated(
  config: AppConfig,
  chatId: string,
  isForum: boolean,
  title?: string,
): Promise<void> {
  try {
    await sendTelegramBotEvent(config, {
      eventType: "chat_forum_updated" as const,
      chatId,
      isForum,
      title,
    });
  } catch {
    // Gateon API unreachable or rejected the event
  }
}

async function notifyForumTopicUpsert(
  config: AppConfig,
  payload: {
    chatId: string;
    messageThreadId: number;
    name?: string;
    iconColor?: number;
    isClosed?: boolean;
  },
): Promise<void> {
  try {
    await sendTelegramBotEvent(config, {
      eventType: "forum_topic_upsert",
      ...payload,
    });
  } catch {
    // Gateon API unreachable or rejected the event
  }
}

function getMessageThreadId(ctx: Context): number | undefined {
  const threadId = ctx.message?.message_thread_id;
  return typeof threadId === "number" && threadId > 0 ? threadId : undefined;
}

async function syncForumStatusIfChanged(
  config: AppConfig,
  chat: { id: number; type: string; title?: string; is_forum?: boolean },
): Promise<void> {
  if (chat.type !== "supergroup" || !("is_forum" in chat)) {
    return;
  }

  const chatId = String(chat.id);
  const isForum = chat.is_forum === true;
  const previous = lastForumStatusByChatId.get(chatId);

  if (previous === isForum) {
    return;
  }

  lastForumStatusByChatId.set(chatId, isForum);
  await notifyChatForumUpdated(config, chatId, isForum, chat.title);
}

/** Only propagate is_forum=false from regular chat messages (not topic threads). */
async function syncForumDisabledFromMainChatMessage(
  config: AppConfig,
  ctx: Context,
): Promise<void> {
  const chat = ctx.chat;
  if (chat?.type !== "supergroup" || !("is_forum" in chat)) {
    return;
  }

  if (ctx.message?.message_thread_id !== undefined) {
    return;
  }

  if (chat.is_forum === true) {
    return;
  }

  await syncForumStatusIfChanged(config, chat);
}

export function registerChatForumHandler(
  bot: Bot<Context>,
  config: AppConfig,
): void {
  bot.on("message:forum_topic_created", async (ctx) => {
    if (ctx.chat.type !== "supergroup") {
      return;
    }

    const created = ctx.message?.forum_topic_created;
    const messageThreadId = getMessageThreadId(ctx);
    if (!created?.name || !messageThreadId) {
      return;
    }

    const title = "title" in ctx.chat ? ctx.chat.title : undefined;
    const chatId = String(ctx.chat.id);
    lastForumStatusByChatId.set(chatId, true);

    await notifyChatForumUpdated(config, chatId, true, title);
    await notifyForumTopicUpsert(config, {
      chatId,
      messageThreadId,
      name: created.name,
      iconColor: created.icon_color,
      isClosed: false,
    });

    await triggerTelegramAlerts(config, {
      triggerType: "FORUM_TOPIC_CREATED",
      chatId,
      messageThreadId,
    }).catch((error) => {
      console.error("[gateon/bot] FORUM_TOPIC_CREATED alert trigger failed", error);
    });
  });

  bot.on("message:forum_topic_edited", async (ctx) => {
    if (ctx.chat.type !== "supergroup") {
      return;
    }

    const edited = ctx.message?.forum_topic_edited;
    const messageThreadId = getMessageThreadId(ctx);
    if (!messageThreadId || !edited?.name) {
      return;
    }

    await notifyForumTopicUpsert(config, {
      chatId: String(ctx.chat.id),
      messageThreadId,
      name: edited.name,
    });
  });

  bot.on("message:forum_topic_closed", async (ctx) => {
    if (ctx.chat.type !== "supergroup") {
      return;
    }

    const messageThreadId = getMessageThreadId(ctx);
    if (messageThreadId) {
      await notifyForumTopicUpsert(config, {
        chatId: String(ctx.chat.id),
        messageThreadId,
        isClosed: true,
      });
    }

    await syncForumStatusIfChanged(config, ctx.chat);
  });

  bot.on("message:forum_topic_reopened", async (ctx) => {
    if (ctx.chat.type !== "supergroup") {
      return;
    }

    const messageThreadId = getMessageThreadId(ctx);
    if (!messageThreadId) {
      return;
    }

    await notifyForumTopicUpsert(config, {
      chatId: String(ctx.chat.id),
      messageThreadId,
      isClosed: false,
    });
  });

  bot.on("message:general_forum_topic_hidden", async (ctx) => {
    if (ctx.chat.type !== "supergroup") {
      return;
    }

    await syncForumStatusIfChanged(config, ctx.chat);
  });

  bot.on("message", async (ctx, next) => {
    await syncForumDisabledFromMainChatMessage(config, ctx);
    await next();
  });
}
