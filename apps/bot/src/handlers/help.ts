import type { Bot, Context } from "grammy";
import { buildHelpMessage } from "../telegram-bot-messages.js";

export function registerHelpCommand(bot: Bot<Context>): void {
  bot.command("help", async (ctx) => {
    await ctx.reply(buildHelpMessage(ctx.chat?.type));
  });
}
