import { getBotStartSettings } from "@/lib/server/get-bot-start-settings";
import { BotStartSettingsForm } from "./bot-start-settings-form";

export async function BotStartSettingsSection() {
  const { data, error } = await getBotStartSettings();

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">
          <p className="font-medium text-destructive">
            Não foi possível carregar o /start
          </p>
          <p className="text-destructive/90">{error}</p>
        </div>
      ) : null}
      <BotStartSettingsForm initialSettings={data} />
    </div>
  );
}
