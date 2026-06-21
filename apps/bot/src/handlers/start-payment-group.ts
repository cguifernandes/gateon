import { type Bot, type Context, InlineKeyboard } from "grammy";
import {
  buildBotStartPaymentGroupCallbackData,
  parseBotStartPaymentGroupCallbackData,
} from "../bot-start-payment-callback.js";
import type { AppConfig } from "../config.js";
import {
  fetchBotStartCheckoutButtons,
  fetchBotStartPaymentGroups,
} from "../gateon-api.js";

function getTelegramUserId(ctx: Context): string | null {
  if (!ctx.from) {
    return null;
  }

  return String(ctx.from.id);
}

function buildCheckoutButtonsKeyboard(
  buttons: Array<{ label: string; url: string }>,
): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  for (const button of buttons) {
    keyboard.url(button.label, button.url).row();
  }
  return keyboard;
}

export function registerStartPaymentGroupHandler(
  bot: Bot<Context>,
  config: AppConfig,
): void {
  bot.callbackQuery(/^pbg:/, async (ctx) => {
    const callbackData = ctx.callbackQuery.data;
    const parsed = parseBotStartPaymentGroupCallbackData(callbackData);
    if (!parsed) {
      await ctx.answerCallbackQuery({ text: "Ação inválida." });
      return;
    }

    const telegramUserId = getTelegramUserId(ctx);
    if (!telegramUserId) {
      await ctx.answerCallbackQuery({
        text: "Não foi possível identificar o usuário.",
      });
      return;
    }

    try {
      const { buttons } = await fetchBotStartCheckoutButtons(config, {
        token: parsed.token,
        telegramUserId,
        telegramGroupId: parsed.groupId,
      });

      if (buttons.length === 0) {
        await ctx.answerCallbackQuery({
          text: "Nenhum plano disponível para este grupo.",
          show_alert: true,
        });
        return;
      }

      await ctx.answerCallbackQuery();
      await ctx.reply("Planos disponíveis para este grupo:", {
        reply_markup: buildCheckoutButtonsKeyboard(buttons),
      });
    } catch {
      await ctx.answerCallbackQuery({
        text: "Não foi possível carregar os planos. Tente novamente.",
        show_alert: true,
      });
    }
  });
}

export async function buildPaymentGroupsMarkup(
  config: AppConfig,
  token: string,
  showPaymentButtons: boolean,
  paymentButtonsGroupFirst: boolean,
): Promise<InlineKeyboard | undefined> {
  if (!showPaymentButtons || !paymentButtonsGroupFirst) {
    return undefined;
  }

  try {
    const { groups } = await fetchBotStartPaymentGroups(config, { token });
    if (groups.length === 0) {
      return undefined;
    }

    const keyboard = new InlineKeyboard();
    for (const group of groups) {
      keyboard
        .text(
          group.title,
          buildBotStartPaymentGroupCallbackData(token, group.id),
        )
        .row();
    }

    return keyboard;
  } catch {
    return undefined;
  }
}
