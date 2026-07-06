"use client";

import type { ReactNode } from "react";
import {
  PricingPlanCard,
  toPlanCardPlan,
} from "@/components/pricing-plan-card";
import { PLAN_CATALOG } from "@/lib/plan/features";
import { cn } from "@/lib/utils";
import type { PlanId } from "@/lib/zod/plan-schemas";

type PricingPlansSectionProps = {
  mode: "marketing" | "account";
  currentPlanId?: PlanId;
  className?: string;
  header?: ReactNode;
};

const PLAN_ORDER: PlanId[] = ["free", "starter", "pro"];

export function PricingPlansSection({
  mode,
  currentPlanId = "free",
  className,
  header,
}: PricingPlansSectionProps) {
  return (
    <section
      className={cn("space-y-8 w-full flex-1", className)}
      id={mode === "marketing" ? "pricing" : undefined}
    >
      {header ?? (
        <div className="space-y-2 text-center">
          <h2 className="font-heading text-3xl font-extrabold leading-[1.08] tracking-tight text-foreground">
            Planos para cada fase do seu negócio
          </h2>
          <p className="mx-auto max-w-2xl font-light tex text-muted-foreground text-sm sm:text-base">
            Comece grátis e faça upgrade quando precisar automatizar cobrança,
            alertas com gateway de pagamentos e escala.
          </p>
        </div>
      )}

      <div className="grid gap-6 overflow-visible pt-1 lg:grid-cols-3">
        {PLAN_ORDER.map((planId) => (
          <PricingPlanCard
            key={planId}
            plan={toPlanCardPlan(PLAN_CATALOG[planId])}
            mode={mode}
            currentPlanId={currentPlanId}
          />
        ))}
      </div>
    </section>
  );
}

export {
  PricingPlanCard,
  type PricingPlanCardProps,
  type PricingPlanCtaOverride,
  type PricingPlanMode,
} from "@/components/pricing-plan-card";
