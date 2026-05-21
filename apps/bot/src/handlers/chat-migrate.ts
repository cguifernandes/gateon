import type { Bot, Context } from "grammy";
import type { AppConfig } from "../config.js";
import { sendTelegramBotEvent } from "../gateon-api.js";

async function notifyChatMigration(
  config: AppConfig,
  oldChatId: string,
  newChatId: string,
  title?: string,
): Promise<void> {
  try {
    await sendTelegramBotEvent(config, {
      eventType: "chat_migrated" as const,
      oldChatId,
      newChatId,
      title,
    });
  } catch {
    // Gateon API unreachable or rejected the event
  }
}

export function registerChatMigrateHandler(
  bot: Bot<Context>,
  config: AppConfig,
): void {
  bot.on("message:migrate_to_chat_id", async (ctx) => {
    const newChatId = ctx.message.migrate_to_chat_id;
    if (newChatId === undefined) {
      return;
    }

    const title = "title" in ctx.chat ? ctx.chat.title : undefined;
    await notifyChatMigration(
      config,
      String(ctx.chat.id),
      String(newChatId),
      title,
    );
  });

  bot.on("message:migrate_from_chat_id", async (ctx) => {
    const oldChatId = ctx.message.migrate_from_chat_id;
    if (oldChatId === undefined) {
      return;
    }

    const title = "title" in ctx.chat ? ctx.chat.title : undefined;
    await notifyChatMigration(
      config,
      String(oldChatId),
      String(ctx.chat.id),
      title,
    );
  });
}
