import {
  DEFAULT_PLAN_ID,
  getMaxStripePaymentGroupsForPlan,
  PLAN_LABELS,
} from "@/lib/plan/limits";
import type { PlanId } from "@/lib/zod/plan-schemas";
import {
  type StripeBillingStatusDto,
  stripeBillingStatusSchema,
} from "@/lib/zod/stripe-billing-schemas";
import {
  fetchAuthenticatedUpstreamJson,
  resolveUpstreamSession,
} from "../fetch/authenticated-upstream";
import { getSessionUser } from "./get-session";

function buildEmptyStripeBillingStatus(planId: PlanId): StripeBillingStatusDto {
  return {
    connected: false,
    canConnect: true,
    connections: [],
    totals: {
      activeSubscriptionCount: 0,
      expiringSubscriptionCount: 0,
      expiredSubscriptionCount: 0,
      customerCount: 0,
      monthlyRevenueCents: 0,
      receivedPaymentCount: 0,
      failedPaymentCount: 0,
    },
    stripePaymentGroupLimit: {
      planId,
      planLabel: PLAN_LABELS[planId],
      maxDistinctGroups: getMaxStripePaymentGroupsForPlan(planId),
      usedDistinctGroups: 0,
    },
  };
}

export async function getStripeBillingStatus(): Promise<{
  data: StripeBillingStatusDto;
  error: string | null;
}> {
  const user = await getSessionUser();
  const planId = user?.planId ?? DEFAULT_PLAN_ID;
  const emptyStripeBillingStatus = buildEmptyStripeBillingStatus(planId);

  const session = await resolveUpstreamSession();
  if (!session.ok) {
    return { data: emptyStripeBillingStatus, error: session.error };
  }

  const result = await fetchAuthenticatedUpstreamJson({
    path: "/stripe-billing",
    schema: stripeBillingStatusSchema,
    httpErrorMessage: "Não foi possível carregar a integração Stripe.",
    includeUpstreamApiHeaders: true,
  });

  if (!result.ok) {
    return { data: emptyStripeBillingStatus, error: result.error };
  }

  return { data: result.data, error: null };
}
