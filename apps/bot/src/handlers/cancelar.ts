import type { Bot, Context } from "grammy";
import { InlineKeyboard } from "grammy";
import type { AppConfig } from "../config.js";
import { fetchSubscriptionCancelPortal } from "../gateon-api.js";

export function registerCancelarCommand(
  bot: Bot<Context>,
  config: AppConfig,
): void {
  bot.command("cancelar", async (ctx) => {
    if (ctx.chat?.type !== "private") {
      await ctx.reply(
        "O comando /cancelar só funciona no chat privado com o bot. Abra uma conversa direta comigo e envie /cancelar de novo.",
      );
      return;
    }

    const telegramUserId = ctx.from?.id;
    if (!telegramUserId) {
      await ctx.reply("Não foi possível identificar seu usuário no Telegram.");
      return;
    }

    try {
      const { options } = await fetchSubscriptionCancelPortal(
        config,
        String(telegramUserId),
      );

      const keyboard = new InlineKeyboard();
      for (const option of options) {
        keyboard.url(option.label, option.url).row();
      }

      const intro =
        options.length === 1
          ? "Toque no botão abaixo para abrir o portal seguro da Stripe e cancelar ou gerenciar sua assinatura:"
          : "Encontramos mais de uma assinatura vinculada a este Telegram. Escolha qual plano deseja gerenciar ou cancelar na Stripe:";

      await ctx.reply(intro, {
        reply_markup: keyboard,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Não foi possível abrir o portal de cancelamento agora.";

      await ctx.reply(message);
    }
  });
}
