import { type Bot, type Context, InlineKeyboard } from "grammy";
import { buildConfiguredStartMessage } from "../bot-start-message-builder.js";
import type { AppConfig } from "../config.js";
import {
  fetchBotStartCheckoutButtons,
  fetchBotStartPublicSettings,
  sendTelegramBotEvent,
} from "../gateon-api.js";
import {
  gateonGroupNotifySlotKey,
  tryConsumeGateonGroupNotifySlot,
} from "../gateon-group-notify.js";
import { extractAdministratorRightsPayload } from "../telegram-admin-rights.js";
import { buildStartWithoutTokenMessage } from "../telegram-bot-messages.js";
import {
  replyForGateonApiError,
  replyForTelegramConnectionReason,
} from "../telegram-connection-replies.js";
import { buildPaymentGroupsMarkup } from "./start-payment-group.js";

const PUBLIC_START_TOKEN_PREFIX = "g_";

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

function getStartPayload(ctx: Context): string {
  return typeof ctx.match === "string" ? ctx.match.trim() : "";
}

function getTelegramUser(ctx: Context): TelegramUserPayload | null {
  if (!ctx.from) {
    return null;
  }

  return {
    id: String(ctx.from.id),
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

async function buildPaymentButtonsMarkup(
  config: AppConfig,
  token: string,
  telegramUserId: string,
  showPaymentButtons: boolean,
): Promise<InlineKeyboard | undefined> {
  if (!showPaymentButtons) {
    return undefined;
  }

  try {
    const { buttons } = await fetchBotStartCheckoutButtons(config, {
      token,
      telegramUserId,
    });

    if (buttons.length === 0) {
      return undefined;
    }

    const keyboard = new InlineKeyboard();
    for (const button of buttons) {
      keyboard.url(button.label, button.url).row();
    }
    return keyboard;
  } catch {
    return undefined;
  }
}

export function registerStartCommand(
  bot: Bot<Context>,
  config: AppConfig,
): void {
  bot.command("start", async (ctx) => {
    const token = getStartPayload(ctx);
    const telegramUser = getTelegramUser(ctx);

    if (!token || !telegramUser) {
      await ctx.reply(buildStartWithoutTokenMessage());
      return;
    }

    if (token.startsWith(PUBLIC_START_TOKEN_PREFIX)) {
      if (ctx.chat?.type !== "private") {
        await ctx.reply(
          "Este link deve ser aberto no chat privado com o bot do Gateon.",
        );
        return;
      }

      const settings = await fetchBotStartPublicSettings(config, token);
      if (!settings) {
        await ctx.reply(
          "Este link de /start não é válido ou foi desativado. Peça um novo link ao criador.",
        );
        return;
      }

      const message = buildConfiguredStartMessage(settings);
      const useGroupFirst =
        settings.showPaymentButtons && settings.paymentButtonsGroupFirst;
      const replyMarkup = useGroupFirst
        ? await buildPaymentGroupsMarkup(
            config,
            token,
            settings.showPaymentButtons,
            settings.paymentButtonsGroupFirst,
          )
        : await buildPaymentButtonsMarkup(
            config,
            token,
            telegramUser.id,
            settings.showPaymentButtons,
          );

      await ctx.reply(
        message,
        replyMarkup ? { reply_markup: replyMarkup } : undefined,
      );
      return;
    }

    if (ctx.chat?.type === "private") {
      try {
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
          [
            "Conta confirmada.",
            "",
            "Toque no botão abaixo e escolha o grupo que deseja conectar ao Gateon.",
            "",
            "Você precisa ser administrador do grupo. Depois de adicionar o bot, promova-o em Administradores com as permissões indicadas no painel.",
          ].join("\n"),
          {
            reply_markup: new InlineKeyboard().url(
              "Escolher grupo",
              startGroupUrl,
            ),
          },
        );
      } catch (error) {
        await ctx.reply(replyForGateonApiError(error));
      }
      return;
    }

    const chat = getTelegramChat(ctx);
    if (!chat || (chat.type !== "group" && chat.type !== "supergroup")) {
      await ctx.reply("Use este link em um grupo do Telegram.");
      return;
    }

    const membership = await getBotMembershipForGateon(ctx);

    try {
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
    } catch (error) {
      await ctx.reply(replyForGateonApiError(error));
    }
  });
}
