import type { Bot, Context } from "grammy";
import type { AppConfig } from "../config.js";
import { sendTelegramBotEvent } from "../gateon-api.js";

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

    const title = "title" in ctx.chat ? ctx.chat.title : undefined;
    lastForumStatusByChatId.set(String(ctx.chat.id), true);

    await notifyChatForumUpdated(config, String(ctx.chat.id), true, title);
  });

  bot.on("message:forum_topic_closed", async (ctx) => {
    if (ctx.chat.type !== "supergroup") {
      return;
    }

    await syncForumStatusIfChanged(config, ctx.chat);
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
