"use client";

import { PricingPlanCard } from "@/components/pricing-plan-card";
import { Progress } from "@/components/ui/progress";
import { useGroupLimit } from "@/contexts/group-limit-context";
import { PLAN_CATALOG } from "@/lib/plan/features";
import {
  getMaxGroupsForPlan,
  getMaxManagedMembersPerGroupForPlan,
  PLAN_LABELS,
} from "@/lib/plan/limits";
import type { PlanId } from "@/lib/zod/plan-schemas";

const UPGRADE_PLAN_ID: PlanId = "starter";

type PlanUsageFooterProps = {
  connectedCount: number;
  maxGroups: number;
  remaining: number;
  isAtLimit: boolean;
  maxMembersPerGroup: number;
  upgradePlanId: PlanId | null;
};

function PlanUsageFooter({
  connectedCount,
  maxGroups,
  remaining,
  isAtLimit,
  maxMembersPerGroup,
  upgradePlanId,
}: PlanUsageFooterProps) {
  const groupUsagePercent =
    maxGroups > 0
      ? Math.min(100, Math.round((connectedCount / maxGroups) * 100))
      : 0;

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/50 p-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-muted-foreground">Grupos conectados</span>
          <span className="font-medium text-foreground tabular-nums">
            {connectedCount}/{maxGroups}
          </span>
        </div>
        <Progress value={groupUsagePercent} className="h-1.5" />
        <p className="text-muted-foreground text-xs leading-relaxed">
          {isAtLimit
            ? "Limite de grupos do plano atingido."
            : `${remaining} ${remaining === 1 ? "vaga disponível" : "vagas disponíveis"}.`}
        </p>
      </div>

      <div>
        <p className="text-muted-foreground text-xs">Por grupo</p>
        <p className="mt-0.5 font-medium text-foreground text-sm">
          Até {maxMembersPerGroup.toLocaleString("pt-BR")} membros rastreados
        </p>
      </div>

      {upgradePlanId ? (
        <p className="text-muted-foreground text-xs leading-relaxed">
          Precisa escalar? O plano {PLAN_LABELS[upgradePlanId]} inclui até{" "}
          {getMaxGroupsForPlan(upgradePlanId)} grupos e{" "}
          {getMaxManagedMembersPerGroupForPlan(upgradePlanId)} membros por
          grupo.
        </p>
      ) : null}
    </div>
  );
}

export function DashboardPlanUpsellCard() {
  const { planId, connectedCount, maxGroups, remaining, isAtLimit } =
    useGroupLimit();
  const isFree = planId === "free";
  const displayPlanId = isFree ? UPGRADE_PLAN_ID : planId;
  const upgradePlanId = planId === "starter" ? ("pro" as const) : null;

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
      extraFooter={
        isFree ? null : (
          <PlanUsageFooter
            connectedCount={connectedCount}
            maxGroups={maxGroups}
            remaining={remaining}
            isAtLimit={isAtLimit}
            maxMembersPerGroup={getMaxManagedMembersPerGroupForPlan(planId)}
            upgradePlanId={upgradePlanId}
          />
        )
      }
    />
  );
}
