import type { AlertTriggerType } from '@prisma/client';
import type { PlanId } from '../zod/plan-schemas';
import { PLAN_LABELS } from './plan-limits';

/** keep in sync with apps/web/src/lib/plan/features.ts */

export type PlanFeatureId =
  | 'stripeWebhook'
  | 'autoRemoveExpiredSubscribers'
  | 'botCheckout'
  | 'stripeAlerts'
  | 'bulkMemberActions'
  | 'advancedTelegramAlerts'
  | 'forumTopicAlerts';

export const PLAN_FEATURE_REQUIRED_CODE = 'PLAN_FEATURE_REQUIRED';

const PLAN_RANK: Record<PlanId, number> = {
  free: 0,
  starter: 1,
  pro: 2,
};

/** Minimum Gateon plan required for each feature. */
export const PLAN_FEATURE_MIN_PLAN: Record<PlanFeatureId, PlanId> = {
  stripeWebhook: 'starter',
  autoRemoveExpiredSubscribers: 'starter',
  botCheckout: 'starter',
  stripeAlerts: 'starter',
  bulkMemberActions: 'starter',
  advancedTelegramAlerts: 'starter',
  forumTopicAlerts: 'pro',
};

export const PLAN_FEATURE_LABELS: Record<PlanFeatureId, string> = {
  stripeWebhook: 'Webhook Stripe em tempo real',
  autoRemoveExpiredSubscribers: 'Remoção automática de inadimplentes',
  botCheckout: 'Checkout no bot (/start)',
  stripeAlerts: 'Alertas Stripe',
  bulkMemberActions: 'Ações em massa de membros',
  advancedTelegramAlerts: 'Alertas Telegram avançados',
  forumTopicAlerts: 'Alertas em tópicos de fórum',
};

/** Future Stripe Billing price lookup keys (Gateon subscription, not user Stripe). */
export const GATEON_PLAN_STRIPE_LOOKUP_KEYS: Record<
  Exclude<PlanId, 'free'>,
  string
> = {
  starter: 'gateon_starter_monthly',
  pro: 'gateon_pro_monthly',
};

export const PLAN_MAX_ALERT_TEMPLATES: Record<PlanId, number | null> = {
  free: 2,
  starter: null,
  pro: null,
};

const FREE_TELEGRAM_ALERT_TRIGGERS = new Set<AlertTriggerType>([
  'MEMBER_JOINED',
  'MEMBER_LEFT',
]);

const STRIPE_ALERT_TRIGGER_PREFIX = 'STRIPE_';

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
  triggerType: AlertTriggerType | null | undefined,
): boolean {
  if (!triggerType) {
    return true;
  }

  if (isStripeAlertTrigger(triggerType)) {
    return hasPlanFeature(planId, 'stripeAlerts');
  }

  if (triggerType === 'FORUM_TOPIC_CREATED') {
    return hasPlanFeature(planId, 'forumTopicAlerts');
  }

  if (FREE_TELEGRAM_ALERT_TRIGGERS.has(triggerType)) {
    return true;
  }

  return hasPlanFeature(planId, 'advancedTelegramAlerts');
}

export function buildPlanFeatureRequiredMessage(
  feature: PlanFeatureId,
  currentPlanId: PlanId,
): string {
  const requiredPlanId = getMinPlanForFeature(feature);
  return `O plano ${PLAN_LABELS[currentPlanId]} não inclui ${PLAN_FEATURE_LABELS[feature]}. Faça upgrade para ${PLAN_LABELS[requiredPlanId]}.`;
}
