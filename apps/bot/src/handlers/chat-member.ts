import type { Bot, Context } from "grammy";
import type { AppConfig } from "../config.js";
import { sendTelegramBotEvent } from "../gateon-api.js";

export function registerChatMemberHandler(
  bot: Bot<Context>,
  config: AppConfig,
): void {
  bot.on("chat_member", async (ctx) => {
    const update = ctx.chatMember;
    if (!update) {
      return;
    }

    const chat = update.chat;
    if (chat.type !== "group" && chat.type !== "supergroup") {
      return;
    }

    const member = update.new_chat_member;
    const user = member.user;
    if (user.is_bot) {
      return;
    }

    const previousUser = update.old_chat_member.user;

    try {
      await sendTelegramBotEvent(config, {
        eventType: "chat_member",
        chat: {
          id: String(chat.id),
          title: "title" in chat ? chat.title : undefined,
          type: chat.type,
        },
        subjectUser: {
          id: String(user.id),
          firstName: user.first_name ?? previousUser.first_name,
          lastName: user.last_name ?? previousUser.last_name,
          isBot: user.is_bot,
        },
        newMemberStatus: member.status,
      });
    } catch (err) {
      console.error("[gateon/bot] chat_member event failed", err);
    }
  });
}
