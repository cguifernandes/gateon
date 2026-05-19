import "./load-env.js";
import { API_CONSTANTS, Bot } from "grammy";
import { loadConfig } from "./config.js";
import { registerChatMemberHandler } from "./handlers/chat-member.js";
import { registerHelpCommand } from "./handlers/help.js";
import { registerMyChatMemberHandler } from "./handlers/my-chat-member.js";
import { registerStartCommand } from "./handlers/start.js";

async function bootstrap() {
  const config = loadConfig();
  const bot = new Bot(config.TELEGRAM_BOT_TOKEN);

  registerStartCommand(bot, config);
  registerHelpCommand(bot);
  registerChatMemberHandler(bot, config);
  registerMyChatMemberHandler(bot, config);

  bot.catch((err) => {
    console.error("[gateon/bot]", err);
  });

  await bot.start({
    allowed_updates: [...API_CONSTANTS.ALL_UPDATE_TYPES],
    onStart: (me) => {
      console.info(`[gateon/bot] @${me.username ?? "bot"} ready`);
    },
  });
}

bootstrap().catch((err) => {
  console.error("[gateon/bot]", err);
  process.exit(1);
});
