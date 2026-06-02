import type { Bot, Context } from "grammy";
import type { AppConfig } from "../config.js";
import { sendTelegramBotEvent } from "../gateon-api.js";
import { fetchGroupSettings } from "../group-settings/fetch-group-settings.js";
import {
  gateonGroupNotifySlotKey,
  tryConsumeGateonGroupNotifySlot,
} from "../gateon-group-notify.js";
import { extractAdministratorRightsPayload } from "../telegram-admin-rights.js";
import { replyForTelegramConnectionReason } from "../telegram-connection-replies.js";

function shouldProcessStatus(status: string): boolean {
  return status === "member" || status === "administrator";
}

export function registerMyChatMemberHandler(
  bot: Bot<Context>,
  config: AppConfig,
): void {
  bot.on("my_chat_member", async (ctx) => {
    const update = ctx.myChatMember;
    const botStatus = update.new_chat_member.status;

    if (!shouldProcessStatus(botStatus)) {
      return;
    }

    const member = update.new_chat_member;
    const administratorRights = extractAdministratorRightsPayload(member);

    const result = await sendTelegramBotEvent(config, {
      eventType: "bot_chat_member",
      telegramUser: {
        id: String(update.from.id),
        firstName: update.from.first_name,
        lastName: update.from.last_name,
      },
      chat: {
        id: String(update.chat.id),
        title: "title" in update.chat ? update.chat.title : undefined,
        type: update.chat.type,
      },
      botStatus,
      administratorRights,
    });

    const dedupeKey = gateonGroupNotifySlotKey(result);
    if (dedupeKey) {
      if (!tryConsumeGateonGroupNotifySlot(update.chat.id, dedupeKey)) {
        return;
      }
    }

    const reasonMessage = replyForTelegramConnectionReason(
      result.reason,
      result.missingRequiredRightIds,
      result.group ? "existing_group" : "connection",
    );
    if (reasonMessage) {
      if (result.group) {
        const settings = await fetchGroupSettings(config, update.chat.id).catch(
          () => null,
        );
        if (settings?.connected && !settings.settings.notifyPermissionLoss) {
          return;
        }
      }
      await ctx.api.sendMessage(update.chat.id, reasonMessage);
      return;
    }

    if (result.status === "CONNECTED") {
      await ctx.api.sendMessage(
        update.chat.id,
        "Conexao concluida com sucesso. O Gateon ja pode gerenciar este grupo.",
      );
    }
  });
}
