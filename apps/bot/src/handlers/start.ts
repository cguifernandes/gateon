import type { Bot, Context } from "grammy";

export function registerStartCommand(bot: Bot<Context>): void {
  bot.command("start", async (ctx) => {
    await ctx.reply(
      "Ola! O Gateon esta no ar. Use o painel web para cadastrar grupos e permissoes.",
    );
  });
}
