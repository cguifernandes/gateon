"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useGroupLimit } from "@/contexts/group-limit-context";
import {
  getMinPlanForFeature,
  hasPlanFeature,
  PLAN_FEATURE_LABELS,
  type PlanFeatureId,
} from "@/lib/plan/features";
import { PLAN_LABELS } from "@/lib/plan/limits";
import { cn } from "@/lib/utils";

type PlanFeatureGateProps = {
  feature: PlanFeatureId;
  children: ReactNode;
  className?: string;
  /** When set, overrides the default feature label in the overlay message. */
  message?: string;
};

export function PlanFeatureGate({
  feature,
  children,
  className,
  message,
}: PlanFeatureGateProps) {
  const { planId } = useGroupLimit();
  const allowed = hasPlanFeature(planId, feature);

  if (allowed) {
    return <>{children}</>;
  }

  const requiredPlanId = getMinPlanForFeature(feature);
  const overlayMessage =
    message ??
    `${PLAN_FEATURE_LABELS[feature]} está disponível no plano ${PLAN_LABELS[requiredPlanId]}.`;

  return (
    <div className={cn("relative", className)}>
      <div
        className="pointer-events-none select-none blur-[3px] opacity-55"
        aria-hidden
      >
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-xl bg-background/70 p-4 text-center backdrop-blur-[3px]">
        <p className="max-w-xs text-sm font-medium leading-relaxed text-foreground">
          {overlayMessage}
        </p>
        <Button
          nativeButton={false}
          size="sm"
          render={<Link href="/subscription" />}
        >
          Ver planos
        </Button>
      </div>
    </div>
  );
}
