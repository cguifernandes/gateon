"use client";

import {
  PricingPlanCard,
  toPlanCardPlan,
} from "@/components/pricing-plan-card";
import type { AvailablePlan } from "@/lib/zod/billing-schemas";
import type { PlanId } from "@/lib/zod/plan-schemas";

type DashboardPlanUpsellCardProps = {
  nextPlan?: AvailablePlan | null;
  planId?: PlanId;
};

export function DashboardPlanUpsellCard({
  nextPlan,
  planId = "free",
}: DashboardPlanUpsellCardProps) {
  // Se não tem plano de upgrade (já está no maior plano), não mostra card
  if (!nextPlan) return null;

  const isFree = planId === "free";

  return (
    <PricingPlanCard
      plan={toPlanCardPlan({ ...nextPlan })}
      mode="account"
      currentPlanId={planId}
      scaled={false}
      maxFeatures={5}
      patternClassName="p-0!"
      ctaOverride={{
        href: "/subscription",
        label: "Ver mais",
        variant: isFree ? "default" : "outline",
      }}
    />
  );
}
