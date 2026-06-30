import { cache } from "react";
import { getServerApiBaseUrl } from "@/lib/http/api-base-url";
import { availablePlanSchema } from "@/lib/zod/billing-schemas";
import { z } from "zod";

const plansResponseSchema = z.array(availablePlanSchema);

export type AvailablePlan = z.infer<typeof availablePlanSchema>;

export const getBillingPlans = cache(async (): Promise<AvailablePlan[]> => {
  const base = getServerApiBaseUrl();
  if (!base) return [];

  try {
    const res = await fetch(`${base}/billing/products`, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) return [];

    const json: unknown = await res.json();
    const parsed = plansResponseSchema.safeParse(json);
    return parsed.success ? parsed.data : [];
  } catch {
    return [];
  }
});

/**
 * Retorna o plano de upgrade baseado no plano atual.
 * free → primeiro plano pago (starter), starter → próximo (pro), pro → null
 */
export function getNextPlan(
  currentPlanId: string,
  plans: AvailablePlan[],
): AvailablePlan | null {
  const paidPlans = plans
    .filter((p) => p.planId && p.planId !== "free")
    .sort((a, b) => a.price - b.price);

  if (paidPlans.length === 0) return null;

  if (currentPlanId === "free") return paidPlans[0];

  const currentIndex = paidPlans.findIndex(
    (p) => p.planId === currentPlanId,
  );

  if (currentIndex === -1 || currentIndex >= paidPlans.length - 1) return null;

  return paidPlans[currentIndex + 1];
}