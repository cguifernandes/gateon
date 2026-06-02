import type { Bot, Context } from "grammy";
import type { AppConfig } from "../config.js";
import type { AlertTriggerType } from "../alert-triggers.js";
import { sendTelegramBotEvent, triggerTelegramAlerts } from "../gateon-api.js";
import { getActiveGroupBotSettings } from "../group-settings/is-bot-active.js";

function isJoinStatus(status: string): boolean {
  return status === "member" || status === "administrator" || status === "creator";
}

function wasParticipating(status: string): boolean {
  return isJoinStatus(status) || status === "restricted";
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

async function fireAutomationTrigger(
  config: AppConfig,
  triggerType: AlertTriggerType,
  chatId: string,
  telegramUserId: string,
) {
  await triggerTelegramAlerts(config, {
    triggerType,
    chatId,
    telegramUserId,
  }).catch((error) => {
    console.error(`[gateon/bot] alert trigger failed (${triggerType})`, error);
  });
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
    const oldStatus = update.old_chat_member.status;
    const newStatus = member.status;
    const chatId = String(chat.id);
    const telegramUserId = String(user.id);

    try {
      await sendTelegramBotEvent(config, {
        eventType: "chat_member",
        chat: {
          id: chatId,
          title: "title" in chat ? chat.title : undefined,
          type: chat.type,
        },
        subjectUser: {
          id: telegramUserId,
          firstName: user.first_name ?? previousUser.first_name,
          lastName: user.last_name ?? previousUser.last_name,
          isBot: user.is_bot,
        },
        newMemberStatus: newStatus,
      });

      if (isJoinStatus(newStatus) && !isJoinStatus(oldStatus)) {
        await fireAutomationTrigger(
          config,
          "MEMBER_JOINED",
          chatId,
          telegramUserId,
        );

        const settings = await getActiveGroupBotSettings(config, chat.id);
        if (settings) {
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
        }
      } else if (newStatus === "left" && wasParticipating(oldStatus)) {
        await fireAutomationTrigger(
          config,
          "MEMBER_LEFT",
          chatId,
          telegramUserId,
        );
      } else if (newStatus === "kicked") {
        await fireAutomationTrigger(
          config,
          "MEMBER_BANNED",
          chatId,
          telegramUserId,
        );
      }
    } catch (err) {
      console.error("[gateon/bot] chat_member event failed", err);
    }
  });
}
