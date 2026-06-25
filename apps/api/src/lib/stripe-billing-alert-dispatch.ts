import {
  AlertTriggerType,
  Prisma,
  type StripeBillingAuditAction,
} from '@prisma/client';
import type { AlertsService } from '../modules/alerts/alerts.service';
import type { PrismaService } from '../modules/prisma/prisma.service';
import {
  resolveStripeLinkedTelegramSubscriber,
  type StripeLinkedTelegramSubscriber,
} from './stripe-telegram-subscriber';
import {
  resolveInvoicePaymentTrigger,
  resolveSubscriptionStripeTrigger,
  STRIPE_SUBSCRIPTION_AUDIT_ACTION_BY_TRIGGER,
  type SubscriptionSnapshot,
} from './stripe-billing-sync-events';

export type StripeAutomationDispatchDeps = {
  alerts: Pick<AlertsService, 'triggerAutomationAlertsForUser'>;
  prisma: Pick<
    PrismaService,
    | 'stripeBillingAuditLogs'
    | 'stripeTelegramMemberLinks'
    | 'telegramGroupMembers'
  >;
  recordAudit?: (
    userId: string,
    connectionId: string,
    action: StripeBillingAuditAction,
    metadata?: Prisma.InputJsonValue,
  ) => Promise<void>;
};

export type StripeAutomationStripeContext = {
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
};

async function resolveSubscriberForStripeContext(
  deps: StripeAutomationDispatchDeps,
  connectionId: string,
  stripeContext?: StripeAutomationStripeContext,
): Promise<StripeLinkedTelegramSubscriber | null> {
  if (!stripeContext) {
    return null;
  }

  return resolveStripeLinkedTelegramSubscriber(
    deps.prisma,
    {
      connectionId,
      stripeCustomerId: stripeContext.stripeCustomerId,
      stripeSubscriptionId: stripeContext.stripeSubscriptionId,
    },
    { includeRevokedLinks: true },
  );
}

export async function dispatchStripeAutomationTrigger(
  deps: StripeAutomationDispatchDeps,
  userId: string,
  connectionId: string,
  triggerType: AlertTriggerType,
  stripeContext?: StripeAutomationStripeContext,
) {
  console.log('[alert-dispatch] dispatchStripeAutomationTrigger:start', {
    userId,
    connectionId,
    triggerType,
    stripeContext,
  });

  const subscriber = await resolveSubscriberForStripeContext(
    deps,
    connectionId,
    stripeContext,
  );

  console.log('[alert-dispatch] dispatchStripeAutomationTrigger:subscriber', {
    connectionId,
    triggerType,
    subscriber: subscriber ?? null,
    deliveryChannel: subscriber ? 'telegram_dm' : 'none (no subscriber link)',
  });

  const result = await deps.alerts.triggerAutomationAlertsForUser(
    userId,
    triggerType,
    connectionId,
    subscriber ?? undefined,
  );

  console.log('[alert-dispatch] dispatchStripeAutomationTrigger:result', {
    connectionId,
    triggerType,
    triggeredCount: result.triggeredCount,
  });

  if (result.triggeredCount === 0) {
    return result;
  }

  await deps.prisma.stripeBillingAuditLogs.create({
    data: {
      userId,
      action: 'AUTOMATION_TRIGGERED',
      metadata: {
        triggerType,
        triggeredCount: result.triggeredCount,
        deliveryChannel: subscriber ? 'telegram_dm' : 'telegram_group',
        ...(subscriber ? { telegramUserId: subscriber.telegramUserId } : {}),
      },
    },
  });

  return result;
}

export async function dispatchSubscriptionStripeTrigger(
  deps: StripeAutomationDispatchDeps,
  userId: string,
  connectionId: string,
  triggerType: AlertTriggerType,
  stripeSubscriptionId: string,
  stripeCustomerId?: string | null,
) {
  const action = STRIPE_SUBSCRIPTION_AUDIT_ACTION_BY_TRIGGER[triggerType] as
    | StripeBillingAuditAction
    | undefined;

  if (action && deps.recordAudit) {
    await deps.recordAudit(userId, connectionId, action, {
      stripeSubscriptionId,
    });
  }

  return dispatchStripeAutomationTrigger(
    deps,
    userId,
    connectionId,
    triggerType,
    { stripeSubscriptionId, stripeCustomerId },
  );
}

export async function processSubscriptionStripeEvent(
  deps: StripeAutomationDispatchDeps,
  params: {
    userId: string;
    connectionId: string;
    existing: SubscriptionSnapshot | null;
    status: string;
    currentPeriodEnd: Date | null;
    cancelAtPeriodEnd?: boolean;
    stripeSubscriptionId: string;
    stripeCustomerId?: string | null;
    nowMs?: number;
  },
) {
  const triggerType = resolveSubscriptionStripeTrigger(
    params.existing,
    params.status,
    params.currentPeriodEnd,
    params.cancelAtPeriodEnd ?? false,
    params.nowMs,
  );
  if (!triggerType) {
    return null;
  }

  await dispatchSubscriptionStripeTrigger(
    deps,
    params.userId,
    params.connectionId,
    triggerType,
    params.stripeSubscriptionId,
    params.stripeCustomerId,
  );

  return triggerType;
}

export async function processInvoiceStripeEvent(
  deps: StripeAutomationDispatchDeps,
  userId: string,
  connectionId: string,
  invoiceStatus: string,
  stripeInvoiceId?: string,
  stripeCustomerId?: string | null,
) {
  const triggerType = resolveInvoicePaymentTrigger(invoiceStatus);
  console.log('[alert-dispatch] processInvoiceStripeEvent', {
    userId,
    connectionId,
    invoiceStatus,
    stripeInvoiceId,
    stripeCustomerId,
    triggerType: triggerType ?? null,
  });
  if (!triggerType) {
    return null;
  }

  if (invoiceStatus === 'paid' && deps.recordAudit && stripeInvoiceId) {
    await deps.recordAudit(userId, connectionId, 'PAYMENT_IDENTIFIED', {
      stripeInvoiceId,
    });
  }

  await dispatchStripeAutomationTrigger(
    deps,
    userId,
    connectionId,
    triggerType,
    { stripeCustomerId },
  );
  return triggerType;
}
