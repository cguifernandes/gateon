import type { PlanId } from "@/lib/zod/plan-schemas";

/** keep in sync with apps/api/src/lib/plan/plan-features.ts */

export type PlanFeatureId =
  | "stripeWebhook"
  | "autoRemoveExpiredSubscribers"
  | "botCheckout"
  | "stripeAlerts"
  | "bulkMemberActions"
  | "advancedTelegramAlerts"
  | "forumTopicAlerts";

export const PLAN_FEATURE_REQUIRED_CODE = "PLAN_FEATURE_REQUIRED";

const PLAN_RANK: Record<PlanId, number> = {
  free: 0,
  starter: 1,
  pro: 2,
};

export const PLAN_FEATURE_MIN_PLAN: Record<PlanFeatureId, PlanId> = {
  stripeWebhook: "starter",
  autoRemoveExpiredSubscribers: "starter",
  botCheckout: "starter",
  stripeAlerts: "starter",
  bulkMemberActions: "starter",
  advancedTelegramAlerts: "starter",
  forumTopicAlerts: "pro",
};

export const PLAN_FEATURE_LABELS: Record<PlanFeatureId, string> = {
  stripeWebhook: "Webhook Stripe em tempo real",
  autoRemoveExpiredSubscribers: "Remoção automática de inadimplentes",
  botCheckout: "Checkout no bot (/start)",
  stripeAlerts: "Alertas Stripe",
  bulkMemberActions: "Ações em massa de membros",
  advancedTelegramAlerts: "Alertas Telegram avançados",
  forumTopicAlerts: "Alertas em tópicos de fórum",
};

export const GATEON_PLAN_STRIPE_LOOKUP_KEYS: Record<
  Exclude<PlanId, "free">,
  string
> = {
  starter: "gateon_starter_monthly",
  pro: "gateon_pro_monthly",
};

export const PLAN_MAX_ALERT_TEMPLATES: Record<PlanId, number | null> = {
  free: 2,
  starter: null,
  pro: null,
};

const FREE_TELEGRAM_ALERT_TRIGGERS = new Set<string>([
  "MEMBER_JOINED",
  "MEMBER_LEFT",
]);

const STRIPE_ALERT_TRIGGER_PREFIX = "STRIPE_";

export type PlanCatalogEntry = {
  id: PlanId;
  label: string;
  description: string;
  priceLabel: string;
  priceCents: number | null;
  highlighted: boolean;
  featureBullets: string[];
};

export const PLAN_CATALOG: Record<PlanId, PlanCatalogEntry> = {
  free: {
    id: "free",
    label: "Gratuito",
    description: "Comece a automatizar seu primeiro grupo pago sem custo.",
    priceLabel: "R$ 0",
    priceCents: null,
    highlighted: false,
    featureBullets: [
      "1 grupo conectado",
      "Até 75 membros gerenciados",
      "Alertas de entrada e saída",
      "Até 2 modelos de alerta",
      "1 Produto da Stripe vinculado",
      "Sincronização manual dos produtos Stripe",
    ],
  },
  starter: {
    id: "starter",
    label: "Starter",
    description: "Automatize cobrança, alertas e remoção de inadimplentes.",
    priceLabel: "R$ 29",
    priceCents: 2999,
    highlighted: true,
    featureBullets: [
      "3 grupos conectados",
      "Até 150 membros por grupo",
      "Checkout de pagamento (/start)",
      "Webhook Stripe em tempo real",
      "Alertas Stripe completos",
      "Remoção automática ao expirar",
      "Ações em massa de membros",
    ],
  },
  pro: {
    id: "pro",
    label: "Pro",
    description: "Escale várias comunidades e produtos com prioridade.",
    priceLabel: "R$ 49",
    priceCents: 4999,
    highlighted: false,
    featureBullets: [
      "20 grupos conectados",
      "Até 300 membros por grupo",
      "15 grupos monetizados no /start",
      "Alertas em tópicos de fórum",
      "Suporte prioritário",
      "Tudo do Plano Starter",
    ],
  },
};

export function getMinPlanForFeature(feature: PlanFeatureId): PlanId {
  return PLAN_FEATURE_MIN_PLAN[feature];
}

export function hasPlanFeature(
  planId: PlanId,
  feature: PlanFeatureId,
): boolean {
  return PLAN_RANK[planId] >= PLAN_RANK[PLAN_FEATURE_MIN_PLAN[feature]];
}

export function getMaxAlertTemplatesForPlan(planId: PlanId): number | null {
  return PLAN_MAX_ALERT_TEMPLATES[planId];
}

export function isStripeAlertTrigger(
  triggerType: string | null | undefined,
): boolean {
  return Boolean(triggerType?.startsWith(STRIPE_ALERT_TRIGGER_PREFIX));
}

export function isAlertTriggerAllowedForPlan(
  planId: PlanId,
  triggerType: string | null | undefined,
): boolean {
  if (!triggerType) {
    return true;
  }

  if (isStripeAlertTrigger(triggerType)) {
    return hasPlanFeature(planId, "stripeAlerts");
  }

  if (triggerType === "FORUM_TOPIC_CREATED") {
    return hasPlanFeature(planId, "forumTopicAlerts");
  }

  if (FREE_TELEGRAM_ALERT_TRIGGERS.has(triggerType)) {
    return true;
  }

  return hasPlanFeature(planId, "advancedTelegramAlerts");
}

export function formatGateonPlanPrice(cents: number | null): string {
  if (cents === null) {
    return "R$ 0";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}
