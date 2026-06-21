import { buildBotStartSubscribeSteps } from "./bot-start-subscribe-steps.js";

export type BotStartPublicPlan = {
  connectionId: string;
  label: string;
  monitoredStripePriceId: string | null;
};

export type BotStartPublicPayload = {
  welcomeMessageEnabled: boolean;
  welcomeMessage: string | null;
  showStripePlans: boolean;
  showPaymentButtons: boolean;
  paymentButtonsGroupFirst: boolean;
  showSupportHint: boolean;
  supportHintText: string | null;
  showSubscribeSteps: boolean;
  stripePlans: BotStartPublicPlan[];
};

const DEFAULT_SUPPORT_HINT =
  "Dúvidas? Fale com o administrador do grupo ou responda neste chat.";

const DEFAULT_EMPTY_MESSAGE =
  "Olá! Configure esta mensagem no painel Gateon em Configurações.";

export function buildConfiguredStartMessage(
  payload: BotStartPublicPayload,
): string {
  const sections: string[] = [];

  if (payload.welcomeMessageEnabled && payload.welcomeMessage?.trim()) {
    sections.push(payload.welcomeMessage.trim());
  }

  if (payload.showStripePlans) {
    if (payload.stripePlans.length > 0) {
      const planLines = payload.stripePlans.map(
        (plan, index) => `${index + 1}. ${plan.label}`,
      );
      sections.push(["Planos disponíveis:", ...planLines].join("\n"));
    } else {
      sections.push(
        "Nenhum plano Stripe configurado no momento. Volte em breve ou fale com o administrador.",
      );
    }
  }

  if (payload.showPaymentButtons && !payload.showSubscribeSteps) {
    sections.push(
      payload.paymentButtonsGroupFirst
        ? "Use os botões abaixo para escolher o grupo e, em seguida, o plano."
        : "Use os botões abaixo para escolher um plano e concluir o pagamento.",
    );
  }

  if (payload.showSubscribeSteps) {
    sections.push(
      buildBotStartSubscribeSteps({
        showPaymentButtons: payload.showPaymentButtons,
        paymentButtonsGroupFirst: payload.paymentButtonsGroupFirst,
        showStripePlans: payload.showStripePlans,
      }),
    );
  }

  if (payload.showSupportHint) {
    sections.push(payload.supportHintText?.trim() || DEFAULT_SUPPORT_HINT);
  }

  if (sections.length === 0) {
    return DEFAULT_EMPTY_MESSAGE;
  }

  return sections.join("\n\n");
}
