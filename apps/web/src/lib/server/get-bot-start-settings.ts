import { cookies, headers } from "next/headers";
import { getServerApiBaseUrl, SESSION_COOKIE_NAME } from "@/lib/utils";
import {
  type TelegramBotStartSettingsResponseDto,
  telegramBotStartSettingsResponseSchema,
} from "@/lib/zod/bot-start-settings-schemas";
import { getSessionUser } from "./get-session";

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
  publicStartToken: "",
  publicStartUrl: "",
  botUsername: "",
  availableStripeConnections: [],
};

export async function getBotStartSettings(): Promise<{
  data: TelegramBotStartSettingsResponseDto;
  error: string | null;
}> {
  const base = getServerApiBaseUrl();
  if (!base) {
    return {
      data: emptyBotStartSettings,
      error: "API interna não configurada.",
    };
  }

  const user = await getSessionUser();
  if (!user) {
    return { data: emptyBotStartSettings, error: "Sessão não encontrada." };
  }

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return { data: emptyBotStartSettings, error: "Sessão não encontrada." };
  }

  const requestHeaders = await headers();
  const forwardedFor =
    requestHeaders.get("x-forwarded-for") ?? requestHeaders.get("x-real-ip");

  try {
    const response = await fetch(`${base}/bot-start-settings`, {
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
        ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      return {
        data: emptyBotStartSettings,
        error: "Não foi possível carregar as configurações do /start.",
      };
    }

    const raw: unknown = await response.json();
    const parsed = telegramBotStartSettingsResponseSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        data: emptyBotStartSettings,
        error: "A resposta da API veio em formato inválido.",
      };
    }

    return { data: parsed.data, error: null };
  } catch {
    return {
      data: emptyBotStartSettings,
      error: "A API demorou para responder. Tente novamente.",
    };
  }
}
