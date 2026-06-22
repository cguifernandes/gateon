import { StripeWebhookGuideContent } from "./stripe-webhook-guide-content";

export function StripeWebhookGuideStep() {
  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-sm leading-relaxed">
        O webhook é o que permite alertas e automações{" "}
        <span className="font-medium text-foreground">no momento do evento</span>
        . Você pode configurá-lo logo após conectar — leia abaixo o motivo e o
        passo a passo.
      </p>
      <StripeWebhookGuideContent showPostConnectNote />
    </div>
  );
}
