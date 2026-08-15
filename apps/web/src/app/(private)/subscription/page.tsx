import type { Metadata } from "next";
import { StripePricingSection } from "@/components/stripe-pricing-section";
import { getSessionUser } from "@/lib/server/data/get-session";

export const metadata: Metadata = {
  title: "Assinatura — Gateon",
  description: "Escolha o plano ideal para automatizar seus grupos pagos.",
};

export default async function SubscriptionPage() {
  const user = await getSessionUser();
  const planId = user?.planId ?? "free";

  return (
    <div className="space-y-6 pt-4">
      <StripePricingSection currentPlanId={planId} />
    </div>
  );
}
