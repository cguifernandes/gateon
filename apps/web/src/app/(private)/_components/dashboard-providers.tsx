"use client";

import type { ReactNode } from "react";
import { GroupLimitProvider } from "@/contexts/group-limit-context";
import { DEFAULT_PLAN_ID } from "@/lib/plan-limits";
import type { PlanId } from "@/lib/zod/plan-schemas";

type DashboardProvidersProps = {
  children: ReactNode;
  planId?: PlanId;
};

export function DashboardProviders({
  children,
  planId = DEFAULT_PLAN_ID,
}: DashboardProvidersProps) {
  return <GroupLimitProvider planId={planId}>{children}</GroupLimitProvider>;
}
