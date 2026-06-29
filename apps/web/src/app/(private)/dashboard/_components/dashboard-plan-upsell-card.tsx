"use client";

import { PricingPlanCard } from "@/components/pricing-plan-card";
import { useGroupLimit } from "@/contexts/group-limit-context";
import { PLAN_CATALOG } from "@/lib/plan/features";

export function DashboardPlanUpsellCard() {
  const { planId } = useGroupLimit();
  const isFree = planId === "free";
  const isStarter = planId === "starter";
  const displayPlanId = isFree ? "starter" : isStarter ? "pro" : planId;

  if (planId !== "pro") {
    return (
      <PricingPlanCard
        plan={PLAN_CATALOG[displayPlanId]}
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
}
