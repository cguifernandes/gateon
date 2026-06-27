"use client";

import { PricingPlanCard } from "@/components/pricing-plan-card";
import { useGroupLimit } from "@/contexts/group-limit-context";
import { PLAN_CATALOG } from "@/lib/plan/features";
import type { PlanId } from "@/lib/zod/plan-schemas";

const UPGRADE_PLAN_ID: PlanId = "starter";

export function DashboardPlanUpsellCard() {
  const { planId } = useGroupLimit();
  const isFree = planId === "free";
  const displayPlanId = isFree ? UPGRADE_PLAN_ID : planId;

  return (
    <PricingPlanCard
      plan={PLAN_CATALOG[displayPlanId]}
      mode="account"
      currentPlanId={planId}
      scaled={false}
      maxFeatures={5}
      ctaOverride={{
        href: "/subscription",
        label: "Ver mais",
        variant: isFree ? "default" : "outline",
      }}
    />
  );
}
