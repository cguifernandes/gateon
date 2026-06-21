import { buildBotStartSubscribeSteps } from "@/lib/bot-start-subscribe-steps";

export type BotStartPreviewPlan = {
  label: string;
};

export type BotStartPreviewInput = {
  welcomeMessageEnabled: boolean;
  welcomeMessage: string;
  showStripePlans: boolean;
  showPaymentButtons: boolean;
  paymentButtonsGroupFirst: boolean;
  stripePlans: BotStartPreviewPlan[];
  paymentPlans: BotStartPreviewPlan[];
  paymentGroups: BotStartPreviewPlan[];
  showSupportHint: boolean;
  supportHintText: string;
  showSubscribeSteps: boolean;
};

export const DEFAULT_BOT_START_SUPPORT_HINT =
  "Dúvidas? Fale com o administrador do grupo ou responda neste chat.";

export const DEFAULT_BOT_START_EMPTY_MESSAGE =
  "Olá! Configure esta mensagem no painel Gateon em Configurações.";

export function buildBotStartPreviewMessage(
  input: BotStartPreviewInput,
): string {
  const sections: string[] = [];

  if (input.welcomeMessageEnabled && input.welcomeMessage.trim()) {
    sections.push(input.welcomeMessage.trim());
  }

  if (input.showStripePlans) {
    if (input.stripePlans.length > 0) {
      const planLines = input.stripePlans.map(
        (plan, index) => `${index + 1}. ${plan.label}`,
      );
      sections.push(["Planos disponíveis:", ...planLines].join("\n"));
    } else {
      sections.push(
        "Nenhum plano Stripe configurado no momento. Volte em breve ou fale com o administrador.",
      );
    }
  }

  if (
    input.showPaymentButtons &&
    (input.paymentPlans.length > 0 || input.paymentGroups.length > 0) &&
    !input.showSubscribeSteps
  ) {
    sections.push(
      input.paymentButtonsGroupFirst
        ? "Use os botões abaixo para escolher o grupo e, em seguida, o plano."
        : "Use os botões abaixo para escolher um plano e concluir o pagamento.",
    );
  }

  if (input.showSubscribeSteps) {
    sections.push(
      buildBotStartSubscribeSteps({
        showPaymentButtons: input.showPaymentButtons,
        paymentButtonsGroupFirst: input.paymentButtonsGroupFirst,
        showStripePlans: input.showStripePlans,
      }),
    );
  }

  if (input.showSupportHint) {
    sections.push(
      input.supportHintText.trim() || DEFAULT_BOT_START_SUPPORT_HINT,
    );
  }

  if (sections.length === 0) {
    return DEFAULT_BOT_START_EMPTY_MESSAGE;
  }

  return sections.join("\n\n");
}
