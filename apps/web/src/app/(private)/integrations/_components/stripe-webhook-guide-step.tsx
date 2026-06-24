import { StripeWebhookGuideContent } from "./stripe-webhook-guide-content";

export function StripeWebhookGuideStep() {
  return (
    <div className="space-y-3">
      <StripeWebhookGuideContent showPostConnectNote />
    </div>
  );
}
