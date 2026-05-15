import { InlineKeyboard, type Bot, type Context } from "grammy";
import type { AppConfig } from "../config.js";
import { sendTelegramBotEvent } from "../gateon-api.js";
import { replyForTelegramConnectionReason } from "../telegram-connection-replies.js";
import {
  gateonGroupNotifySlotKey,
  tryConsumeGateonGroupNotifySlot,
} from "../gateon-group-notify.js";
import { extractAdministratorRightsPayload } from "../telegram-admin-rights.js";
import { buildStartWithoutTokenMessage } from "../telegram-bot-messages.js";

type TelegramUserPayload = {
  id: string;
  username?: string;
  firstName?: string;
  lastName?: string;
};

type TelegramChatPayload = {
  id: string;
  title?: string;
  type: string;
};

function getStartPayload(ctx: Context): string {
  return typeof ctx.match === "string" ? ctx.match.trim() : "";
}

function getTelegramUser(ctx: Context): TelegramUserPayload | null {
  if (!ctx.from) {
    return null;
  }

  return {
    id: String(ctx.from.id),
    username: ctx.from.username,
    firstName: ctx.from.first_name,
    lastName: ctx.from.last_name,
  };
}

function getTelegramChat(ctx: Context): TelegramChatPayload | null {
  if (!ctx.chat) {
    return null;
  }

  return {
    id: String(ctx.chat.id),
    title: "title" in ctx.chat ? ctx.chat.title : undefined,
    type: ctx.chat.type,
  };
}

async function getBotMembershipForGateon(ctx: Context): Promise<{
  botStatus: string;
  administratorRights?: ReturnType<typeof extractAdministratorRightsPayload>;
}> {
  const member = await ctx.getChatMember(ctx.me.id);
  return {
    botStatus: member.status,
    administratorRights: extractAdministratorRightsPayload(member),
  };
}

export function registerStartCommand(bot: Bot<Context>, config: AppConfig): void {
  bot.command("start", async (ctx) => {
    const token = getStartPayload(ctx);
    const telegramUser = getTelegramUser(ctx);

    if (!token || !telegramUser) {
      await ctx.reply(buildStartWithoutTokenMessage());
      return;
    }

    if (ctx.chat?.type === "private") {
      const result = await sendTelegramBotEvent(config, {
        eventType: "private_start",
        token,
        telegramUser,
      });

      const startGroupUrl =
        result.startGroupUrl ??
        `https://t.me/${ctx.me.username}?startgroup=${encodeURIComponent(
          token,
        )}`;

      await ctx.reply(
        "Identidade confirmada. Agora selecione o grupo que deseja conectar ao Gateon.",
        {
          reply_markup: new InlineKeyboard().url(
            "Selecionar grupo",
            startGroupUrl,
          ),
        },
      );
      return;
    }

    const chat = getTelegramChat(ctx);
    if (!chat || (chat.type !== "group" && chat.type !== "supergroup")) {
      await ctx.reply("Use este link em um grupo do Telegram.");
      return;
    }

    const membership = await getBotMembershipForGateon(ctx);
    const result = await sendTelegramBotEvent(config, {
      eventType: "group_start",
      token,
      telegramUser,
      chat,
      botStatus: membership.botStatus,
      administratorRights: membership.administratorRights,
    });

    const dedupeKey = gateonGroupNotifySlotKey(result);
    if (dedupeKey) {
      if (!tryConsumeGateonGroupNotifySlot(chat.id, dedupeKey)) {
        return;
      }
    }

    const reasonMessage = replyForTelegramConnectionReason(
      result.reason,
      result.missingRequiredRightIds,
    );
    if (reasonMessage) {
      await ctx.reply(reasonMessage);
      return;
    }

    if (result.status === "CONNECTED") {
      await ctx.reply(
        "Conexao concluida com sucesso. O Gateon ja pode gerenciar este grupo.",
      );
    }
  });
}
