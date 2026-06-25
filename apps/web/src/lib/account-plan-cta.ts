import { isPaidPlan } from "@/lib/plan-limits";
import type { PlanId } from "@/lib/zod/plan-schemas";

export type AccountPlanCta = {
  href: string;
  label: string;
  isUpgrade: boolean;
};

export function resolveAccountPlanCta(planId: PlanId): AccountPlanCta {
  if (!isPaidPlan(planId)) {
    return {
      href: "/#pricing",
      label: "Melhorar seu plano",
      isUpgrade: true,
    };
  }

  return {
    href: "/profile",
    label: "Ver detalhes do meu plano",
    isUpgrade: false,
  };
}
