import "./load-env.js";
import { Bot } from "grammy";
import { loadConfig } from "./config.js";
import { registerStartCommand } from "./handlers/start.js";

async function bootstrap() {
  const config = loadConfig();
  const bot = new Bot(config.TELEGRAM_BOT_TOKEN);

  registerStartCommand(bot);

  bot.catch((err) => {
    console.error("[gateon/bot]", err);
  });

  await bot.start({
    onStart: (me) => {
      console.info(`[gateon/bot] @${me.username ?? "bot"} ready`);
    },
  });
}

bootstrap().catch((err) => {
  console.error("[gateon/bot]", err);
  process.exit(1);
});
