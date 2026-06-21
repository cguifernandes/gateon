export type BotStartSubscribeStepsInput = {
  showPaymentButtons: boolean;
  paymentButtonsGroupFirst?: boolean;
  showStripePlans: boolean;
};

export function buildBotStartSubscribeSteps(
  input: BotStartSubscribeStepsInput,
): string {
  if (input.showPaymentButtons && input.paymentButtonsGroupFirst) {
    return [
      "Como assinar e entrar no grupo:",
      "1. Toque em Iniciar neste chat, se ainda não conversou com o bot.",
      "2. Escolha o grupo nos botões abaixo.",
      "3. Selecione o plano disponível e conclua o pagamento na página segura da Stripe.",
      "4. Após a confirmação, você recebe aqui no Telegram o link de acesso ao grupo.",
    ].join("\n");
  }

  if (input.showPaymentButtons) {
    return [
      "Como assinar e entrar no grupo:",
      "1. Toque em Iniciar neste chat, se ainda não conversou com o bot.",
      "2. Escolha o plano nos botões abaixo e conclua o pagamento na página segura da Stripe.",
      "3. Após a confirmação, você recebe aqui no Telegram o link de acesso ao grupo.",
    ].join("\n");
  }

  if (input.showStripePlans) {
    return [
      "Como assinar:",
      "1. Escolha um dos planos listados acima.",
      "2. Solicite o link de pagamento ao administrador ou aguarde o envio pelo criador.",
      "3. Depois do pagamento confirmado na Stripe, seu acesso ao grupo será liberado.",
    ].join("\n");
  }

  return [
    "Como participar:",
    "1. Fale com o administrador para saber como assinar.",
    "2. Após o pagamento confirmado, aguarde a liberação de acesso ao grupo.",
  ].join("\n");
}
