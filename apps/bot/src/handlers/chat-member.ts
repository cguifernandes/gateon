import type { Bot, Context } from "grammy";
import type { AppConfig } from "../config.js";
import { sendTelegramBotEvent } from "../gateon-api.js";
import { getActiveGroupBotSettings } from "../group-settings/is-bot-active.js";

function isJoinStatus(status: string): boolean {
  return status === "member" || status === "administrator" || status === "creator";
}

function formatDisplayName(user: {
  first_name?: string;
  last_name?: string;
  username?: string;
  id: number | string;
}) {
  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ");
  return fullName || (user.username ? `@${user.username}` : String(user.id));
}

function renderWelcomeMessage(template: string, name: string) {
  return template.replace(/\{name\}/g, name);
}

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

      if (!isJoinStatus(member.status)) {
        return;
      }

      const settings = await getActiveGroupBotSettings(config, chat.id);
      if (!settings) {
        return;
      }

      const message = renderWelcomeMessage(
        settings.welcomeMessage,
        formatDisplayName(user),
      );

      if (settings.welcomeEnabled) {
        await ctx.api.sendMessage(chat.id, message);
      }

      if (settings.privateMessageOnJoin) {
        await ctx.api.sendMessage(user.id, message).catch(() => undefined);
      }
    } catch (err) {
      console.error("[gateon/bot] chat_member event failed", err);
    }
  });
}
