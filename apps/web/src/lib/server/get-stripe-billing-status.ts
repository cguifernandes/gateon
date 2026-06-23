import { cookies, headers } from "next/headers";
import {
  DEFAULT_PLAN_ID,
  getMaxStripePaymentGroupsForPlan,
  PLAN_LABELS,
} from "@/lib/plan-limits";
import { getServerApiBaseUrl, SESSION_COOKIE_NAME } from "@/lib/utils";
import type { PlanId } from "@/lib/zod/plan-schemas";
import {
  type StripeBillingStatusDto,
  stripeBillingStatusSchema,
} from "@/lib/zod/stripe-billing-schemas";
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

  const base = getServerApiBaseUrl();
  if (!base) {
    return {
      data: emptyStripeBillingStatus,
      error: "API interna não configurada.",
    };
  }

  if (!user) {
    return { data: emptyStripeBillingStatus, error: "Sessão não encontrada." };
  }

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return { data: emptyStripeBillingStatus, error: "Sessão não encontrada." };
  }

  const requestHeaders = await headers();
  const forwardedFor =
    requestHeaders.get("x-forwarded-for") ?? requestHeaders.get("x-real-ip");

  try {
    const response = await fetch(`${base}/stripe-billing`, {
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${sessionToken}`,
        ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    if (!response.ok) {
      return {
        data: emptyStripeBillingStatus,
        error: "Não foi possível carregar a integração Stripe.",
      };
    }

    const raw: unknown = await response.json();
    const parsed = stripeBillingStatusSchema.safeParse(raw);
    if (!parsed.success) {
      return {
        data: emptyStripeBillingStatus,
        error: "A resposta da API veio em formato inválido.",
      };
    }

    return { data: parsed.data, error: null };
  } catch {
    return {
      data: emptyStripeBillingStatus,
      error: "A API demorou para responder. Tente novamente.",
    };
  }
}
