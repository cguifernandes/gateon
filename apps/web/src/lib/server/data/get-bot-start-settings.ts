import {
  type TelegramBotStartSettingsResponseDto,
  telegramBotStartSettingsResponseSchema,
} from "@/lib/zod/bot-start-settings-schemas";
import { fetchAuthenticatedUpstreamJson } from "../fetch/authenticated-upstream";

const emptyBotStartSettings: TelegramBotStartSettingsResponseDto = {
  welcomeMessageEnabled: true,
  welcomeMessage: "",
  showStripePlans: false,
  stripeConnectionIds: [],
  showPaymentButtons: false,
  paymentButtonConnectionIds: [],
  paymentButtonsGroupFirst: false,
  showSupportHint: true,
  supportHintText: "",
  showSubscribeSteps: true,
  autoRemoveExpiredSubscribers: false,
  canUsePaidAutomation: false,
  planId: "free",
  planLabel: "Gratuito",
  publicStartToken: "",
  publicStartUrl: "",
  botUsername: "",
  availableStripeConnections: [],
};

export async function getBotStartSettings(): Promise<{
  data: TelegramBotStartSettingsResponseDto;
  error: string | null;
}> {
  const result = await fetchAuthenticatedUpstreamJson({
    path: "/bot-start-settings",
    schema: telegramBotStartSettingsResponseSchema,
    httpErrorMessage: "Não foi possível carregar as configurações do /start.",
  });

  if (!result.ok) {
    return { data: emptyBotStartSettings, error: result.error };
  }

  return { data: result.data, error: null };
}
