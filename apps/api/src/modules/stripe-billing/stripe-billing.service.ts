import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { IncomingHttpHeaders } from 'node:http';
import { ConfigService } from '@nestjs/config';
import {
  Prisma,
  StripeBillingAuditAction,
  StripeBillingConnectionStatus,
  StripeTelegramCheckoutStatus,
  StripeTelegramMemberLinkStatus,
} from '@prisma/client';
import { decryptSecretValue, encryptSecretValue } from '../../utils/utils';
import { GroupLimitService } from '../../lib/group-limit.service';
import { PLAN_LABELS } from '../../lib/plan-limits';
import {
  countDistinctLinkedStripeGroups,
  getMaxStripePaymentGroupsForPlan,
  STRIPE_PAYMENT_GROUP_LIMIT_REACHED_CODE,
  wouldExceedStripePaymentGroupLimitForLink,
} from '../../lib/stripe-payment-group-limits';
import { resolveStripeCheckoutRedirectUrls } from '../../lib/stripe-checkout-redirect';
import { buildStripeWebhookEndpointUrl } from '../../lib/stripe-billing-webhook-url';
import {
  canOpenStripeSubscriptionCancelPortal,
  isEntitledStripeSubscription,
  pickStripeSubscriptionForCancel,
  reactivateStripeTelegramMemberLinks,
  revokeStripeTelegramMemberLinks,
  shouldRevokeStripeTelegramMemberLinkForSubscription,
} from '../../lib/stripe-telegram-member-links';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import {
  StripeBillingConnectInput,
  StripeBillingPreviewCatalogInput,
  StripeBillingUpdateLinkedGroupInput,
  StripeBillingUpdateWebhookSecretInput,
} from '../../lib/zod/stripe-billing-schemas';
import {
  getStripeCustomerId,
  getStripeSubscriptionId,
  StripeBillingStripeClient,
  type StripeCheckoutSessionRecord,
  type StripeCustomerRecord,
  type StripeInvoiceRecord,
  type StripeSubscriptionRecord,
  subscriptionIncludesPrice,
  getStripeCustomerSnapshot,
  getStripePaymentIntentId,
} from '../../lib/stripe-billing-stripe-client';
import { AlertsService } from '../alerts/alerts.service';
import { BotStartSettingsService } from '../bot-start-settings/bot-start-settings.service';
import {
  dispatchSubscriptionStripeTrigger,
  processInvoiceStripeEvent,
} from '../../lib/stripe-billing-alert-dispatch';
import {
  resolveInvoicePaymentTrigger,
  resolveSubscriptionStripeTrigger,
  shouldDispatchInvoicePaymentTrigger,
  STRIPE_EXPIRING_WINDOW_DAYS,
} from '../../lib/stripe-billing-sync-events';
import {
  buildInvoiceAutomationDedupeKey,
  buildSubscriptionAutomationDedupeKey,
  isPrismaUniqueConstraintError,
  shouldDispatchStripeAutomation,
} from '../../lib/stripe-billing-automation-dedup';

const EXPIRING_WINDOW_DAYS = STRIPE_EXPIRING_WINDOW_DAYS;

@Injectable()
export class StripeBillingSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: AlertsService,
    private readonly botStartSettings: BotStartSettingsService,
  ) {}

  private dispatchDeps() {
    return {
      alerts: this.alerts,
      prisma: this.prisma,
      recordAudit: (
        userId: string,
        connectionId: string,
        action: StripeBillingAuditAction,
        metadata?: Prisma.InputJsonValue,
      ) => this.recordAudit(userId, connectionId, action, metadata),
    };
  }

  async syncConnection(userId: string, connectionId: string) {
    const connection = await this.prisma.stripeBillingConnections.findFirst({
      where: { id: connectionId, userId },
      select: {
        id: true,
        encryptedApiKey: true,
        monitoredStripePriceId: true,
        monitoredPlanLabel: true,
      },
    });
    if (!connection)
      throw new NotFoundException('Integração Stripe não encontrada.');

    if (!connection.monitoredStripePriceId) {
      throw new BadRequestException(
        'A integração não possui um plano monitorado configurado.',
      );
    }

    let apiKey: string;
    try {
      apiKey = decryptSecretValue(connection.encryptedApiKey);
    } catch {
      throw new BadRequestException('Chave da Stripe indisponível.');
    }

    const client = new StripeBillingStripeClient(apiKey);
    const monitoredPriceId = connection.monitoredStripePriceId;
    const monitoredPlanLabel = await this.refreshMonitoredPlanMetadata(
      client,
      connectionId,
      monitoredPriceId,
      connection.monitoredPlanLabel,
    );
    const allSubscriptions = await client.listSubscriptions();
    const subscriptions = allSubscriptions.filter((subscription) =>
      subscriptionIncludesPrice(subscription, monitoredPriceId),
    );
    const monitoredCustomerIds = new Set(
      subscriptions
        .map((subscription) => getStripeCustomerId(subscription.customer))
        .filter((customerId): customerId is string => Boolean(customerId)),
    );
    const invoices = (await client.listInvoices()).filter((invoice) => {
      const customerId = getStripeCustomerId(invoice.customer);
      return customerId ? monitoredCustomerIds.has(customerId) : false;
    });

    const customersByStripeId = await this.syncCustomersFromSubscriptions(
      userId,
      connectionId,
      subscriptions,
    );

    const productNames = await this.loadProductNames(client, subscriptions);
    const syncedSubscriptionIds = await this.syncSubscriptions(
      userId,
      connectionId,
      subscriptions,
      customersByStripeId,
      productNames,
      monitoredPlanLabel,
    );
    const syncedInvoiceIds = await this.syncInvoices(
      userId,
      connectionId,
      invoices,
      customersByStripeId,
    );
    await this.pruneOutOfScopeData(
      connectionId,
      syncedSubscriptionIds,
      syncedInvoiceIds,
      [...monitoredCustomerIds],
    );
    await this.updateConnectionMetrics(connectionId);
    await this.recordAudit(userId, connectionId, 'SYNC_EXECUTED', {
      customerCount: monitoredCustomerIds.size,
      subscriptionCount: subscriptions.length,
      invoiceCount: invoices.length,
      monitoredStripePriceId: monitoredPriceId,
    });
  }

  private async refreshMonitoredPlanMetadata(
    client: StripeBillingStripeClient,
    connectionId: string,
    monitoredPriceId: string,
    fallbackLabel: string | null,
  ): Promise<string | null> {
    const result = await this.refreshMonitoredPlanMetadataResult(
      client,
      connectionId,
      monitoredPriceId,
      fallbackLabel,
    );
    return result.label;
  }

  private async refreshMonitoredPlanMetadataResult(
    client: StripeBillingStripeClient,
    connectionId: string,
    monitoredPriceId: string,
    fallbackLabel: string | null,
  ): Promise<{ label: string | null; refreshed: boolean }> {
    try {
      const price = await client.getPrice(monitoredPriceId);
      const mapped = client.mapCatalogPrice(price);

      await this.prisma.stripeBillingConnections.update({
        where: { id: connectionId },
        data: {
          monitoredPlanLabel: mapped.label,
          ...(mapped.productId
            ? { monitoredStripeProductId: mapped.productId }
            : {}),
        },
      });

      return { label: mapped.label, refreshed: true };
    } catch {
      return { label: fallbackLabel, refreshed: false };
    }
  }

  async refreshConnectionProductMetadata(
    userId: string,
    connectionId: string,
  ): Promise<'refreshed' | 'skipped' | 'failed'> {
    const connection = await this.prisma.stripeBillingConnections.findFirst({
      where: {
        id: connectionId,
        userId,
        status: StripeBillingConnectionStatus.CONNECTED,
      },
      select: {
        id: true,
        encryptedApiKey: true,
        monitoredStripePriceId: true,
        monitoredPlanLabel: true,
      },
    });

    if (!connection) {
      return 'failed';
    }

    if (!connection.monitoredStripePriceId) {
      return 'skipped';
    }

    let apiKey: string;
    try {
      apiKey = decryptSecretValue(connection.encryptedApiKey);
    } catch {
      return 'failed';
    }

    const client = new StripeBillingStripeClient(apiKey);
    const result = await this.refreshMonitoredPlanMetadataResult(
      client,
      connection.id,
      connection.monitoredStripePriceId,
      connection.monitoredPlanLabel,
    );

    if (!result.refreshed) {
      return 'failed';
    }

    await this.recordAudit(userId, connection.id, 'SYNC_EXECUTED', {
      productsOnly: true,
      monitoredStripePriceId: connection.monitoredStripePriceId,
    });

    return 'refreshed';
  }

  async recordAudit(
    userId: string,
    connectionId: string | null,
    action: StripeBillingAuditAction,
    metadata?: Prisma.InputJsonValue,
  ) {
    await this.prisma.stripeBillingAuditLogs.create({
      data: { userId, connectionId, action, metadata },
    });
  }

  async applySubscriptionFromWebhook(
    connectionId: string,
    subscription: StripeSubscriptionRecord,
  ): Promise<void> {
    const connection = await this.loadConnectedConnection(connectionId);
    if (!connection?.monitoredStripePriceId) {
      return;
    }
    if (
      !subscriptionIncludesPrice(
        subscription,
        connection.monitoredStripePriceId,
      )
    ) {
      return;
    }

    const client = this.createClient(connection.encryptedApiKey);
    const customersByStripeId = await this.syncCustomersFromSubscriptions(
      connection.userId,
      connectionId,
      [subscription],
    );
    const productNames = await this.loadProductNames(client, [subscription]);
    await this.syncSubscriptions(
      connection.userId,
      connectionId,
      [subscription],
      customersByStripeId,
      productNames,
      connection.monitoredPlanLabel,
    );
    await this.updateConnectionMetrics(connectionId);
  }

  async applyInvoiceFromWebhook(
    connectionId: string,
    invoice: StripeInvoiceRecord,
    stripeWebhookEventType?: string,
  ): Promise<void> {
    const connection = await this.loadConnectedConnection(connectionId);
    if (!connection?.monitoredStripePriceId || !invoice.id) {
      return;
    }

    const scopedConnection = {
      id: connection.id,
      encryptedApiKey: connection.encryptedApiKey,
      monitoredStripePriceId: connection.monitoredStripePriceId,
    };

    const inScope = await this.isInvoiceInMonitoredScope(
      scopedConnection,
      invoice,
    );
    if (!inScope) {
      return;
    }

    const customersByStripeId = await this.ensureInvoiceCustomer(
      connection.userId,
      connectionId,
      invoice,
    );
    await this.syncInvoices(
      connection.userId,
      connectionId,
      [invoice],
      customersByStripeId,
      { stripeWebhookEventType },
    );
    await this.updateConnectionMetrics(connectionId);
  }

  private async loadConnectedConnection(connectionId: string) {
    return this.prisma.stripeBillingConnections.findFirst({
      where: { id: connectionId, status: 'CONNECTED' },
      select: {
        id: true,
        userId: true,
        encryptedApiKey: true,
        monitoredStripePriceId: true,
        monitoredPlanLabel: true,
      },
    });
  }

  private createClient(encryptedApiKey: string) {
    return new StripeBillingStripeClient(decryptSecretValue(encryptedApiKey));
  }

  private async isInvoiceInMonitoredScope(
    connection: {
      id: string;
      encryptedApiKey: string;
      monitoredStripePriceId: string;
    },
    invoice: StripeInvoiceRecord,
  ): Promise<boolean> {
    const subscriptionId = getStripeSubscriptionId(invoice.subscription);
    if (subscriptionId) {
      try {
        const subscription = await this.createClient(
          connection.encryptedApiKey,
        ).getSubscription(subscriptionId);
        return subscriptionIncludesPrice(
          subscription,
          connection.monitoredStripePriceId,
        );
      } catch {
        return false;
      }
    }

    const stripeCustomerId = getStripeCustomerId(invoice.customer);
    if (!stripeCustomerId) {
      return false;
    }

    const trackedSubscription =
      await this.prisma.stripeBillingSubscriptions.findFirst({
        where: {
          connectionId: connection.id,
          stripeCustomerId,
        },
        select: { id: true },
      });
    return Boolean(trackedSubscription);
  }

  private async ensureInvoiceCustomer(
    userId: string,
    connectionId: string,
    invoice: StripeInvoiceRecord,
  ) {
    const customersByStripeId = new Map<string, string>();
    const stripeCustomerId = getStripeCustomerId(invoice.customer);
    if (!stripeCustomerId) {
      return customersByStripeId;
    }

    const snapshot = getStripeCustomerSnapshot(invoice.customer);
    const row = await this.prisma.stripeBillingCustomers.upsert({
      where: {
        connectionId_stripeCustomerId: {
          connectionId,
          stripeCustomerId,
        },
      },
      create: {
        userId,
        connectionId,
        stripeCustomerId,
        name: snapshot?.name ?? null,
        email: snapshot?.email?.toLowerCase() ?? null,
      },
      update: {
        ...(snapshot
          ? {
              name: snapshot.name ?? null,
              email: snapshot.email?.toLowerCase() ?? null,
            }
          : {}),
      },
      select: { id: true, stripeCustomerId: true },
    });
    customersByStripeId.set(row.stripeCustomerId, row.id);
    return customersByStripeId;
  }

  private async loadProductNames(
    client: StripeBillingStripeClient,
    subscriptions: StripeSubscriptionRecord[],
  ) {
    const productIds = new Set<string>();
    for (const subscription of subscriptions) {
      const product = subscription.items?.data?.[0]?.price?.product;
      if (typeof product === 'string') {
        productIds.add(product);
      }
    }

    const productNames = new Map<string, string>();
    await Promise.all(
      [...productIds].map(async (productId) => {
        try {
          const product = await client.getProduct(productId);
          if (product.name?.trim()) {
            productNames.set(productId, product.name.trim());
          }
        } catch {
          // Product name is optional metadata for display.
        }
      }),
    );

    return productNames;
  }

  private async syncCustomersFromSubscriptions(
    userId: string,
    connectionId: string,
    subscriptions: StripeSubscriptionRecord[],
  ) {
    const customersByStripeId = new Map<string, string>();
    const uniqueCustomers = new Map<string, StripeCustomerRecord>();

    for (const subscription of subscriptions) {
      const snapshot = getStripeCustomerSnapshot(subscription.customer);
      if (snapshot) {
        uniqueCustomers.set(snapshot.id, snapshot);
      }
    }

    for (const customer of uniqueCustomers.values()) {
      const row = await this.prisma.stripeBillingCustomers.upsert({
        where: {
          connectionId_stripeCustomerId: {
            connectionId,
            stripeCustomerId: customer.id,
          },
        },
        create: {
          userId,
          connectionId,
          stripeCustomerId: customer.id,
          name: customer.name ?? null,
          email: customer.email?.toLowerCase() ?? null,
        },
        update: {
          name: customer.name ?? null,
          email: customer.email?.toLowerCase() ?? null,
        },
        select: { id: true, stripeCustomerId: true },
      });
      customersByStripeId.set(row.stripeCustomerId, row.id);
    }

    return customersByStripeId;
  }

  private async pruneOutOfScopeData(
    connectionId: string,
    subscriptionIds: string[],
    invoiceIds: string[],
    customerIds: string[],
  ) {
    await this.prisma.stripeBillingSubscriptions.deleteMany({
      where: {
        connectionId,
        ...(subscriptionIds.length > 0
          ? { stripeSubscriptionId: { notIn: subscriptionIds } }
          : {}),
      },
    });
    await this.prisma.stripeBillingPayments.deleteMany({
      where: {
        connectionId,
        ...(invoiceIds.length > 0
          ? { stripeInvoiceId: { notIn: invoiceIds } }
          : {}),
      },
    });
    await this.prisma.stripeBillingCustomers.deleteMany({
      where: {
        connectionId,
        ...(customerIds.length > 0
          ? { stripeCustomerId: { notIn: customerIds } }
          : {}),
      },
    });
  }

  private async syncSubscriptions(
    userId: string,
    connectionId: string,
    subscriptions: StripeSubscriptionRecord[],
    customersByStripeId: Map<string, string>,
    productNames: Map<string, string>,
    monitoredPlanLabel: string | null,
  ) {
    const syncedSubscriptionIds: string[] = [];

    for (const subscription of subscriptions) {
      syncedSubscriptionIds.push(subscription.id);
      const stripeCustomerId = getStripeCustomerId(subscription.customer);
      await this.ensureCustomer(
        userId,
        connectionId,
        subscription,
        customersByStripeId,
      );

      const existing = await this.prisma.stripeBillingSubscriptions.findUnique({
        where: {
          connectionId_stripeSubscriptionId: {
            connectionId,
            stripeSubscriptionId: subscription.id,
          },
        },
        select: {
          status: true,
          currentPeriodEnd: true,
          cancelAtPeriodEnd: true,
          lastEventType: true,
          lastAutomationDedupeKey: true,
        },
      });
      const status = subscription.status ?? 'unknown';
      const currentPeriodEnd = this.fromUnix(subscription.current_period_end);
      const cancelAtPeriodEnd = subscription.cancel_at_period_end === true;
      const eventType = resolveSubscriptionStripeTrigger(
        existing,
        status,
        currentPeriodEnd,
        cancelAtPeriodEnd,
      );
      const automationDedupeKey = eventType
        ? buildSubscriptionAutomationDedupeKey(eventType, {
            stripeSubscriptionId: subscription.id,
            status,
            currentPeriodEnd,
            cancelAtPeriodEnd,
          })
        : null;
      const shouldDispatchAutomation =
        Boolean(eventType) &&
        Boolean(automationDedupeKey) &&
        shouldDispatchStripeAutomation(
          existing?.lastAutomationDedupeKey,
          automationDedupeKey!,
        );

      await this.prisma.stripeBillingSubscriptions.upsert({
        where: {
          connectionId_stripeSubscriptionId: {
            connectionId,
            stripeSubscriptionId: subscription.id,
          },
        },
        create: {
          userId,
          connectionId,
          customerId: stripeCustomerId
            ? customersByStripeId.get(stripeCustomerId)
            : undefined,
          stripeSubscriptionId: subscription.id,
          stripeCustomerId,
          status,
          planName:
            monitoredPlanLabel ?? this.getPlanName(subscription, productNames),
          currentPeriodEnd,
          cancelAtPeriodEnd,
          canceledAt: this.fromUnix(subscription.canceled_at),
          ...(eventType ? { lastEventType: eventType } : {}),
          ...(shouldDispatchAutomation && automationDedupeKey
            ? { lastAutomationDedupeKey: automationDedupeKey }
            : {}),
        },
        update: {
          customerId: stripeCustomerId
            ? customersByStripeId.get(stripeCustomerId)
            : undefined,
          stripeCustomerId,
          status,
          planName:
            monitoredPlanLabel ?? this.getPlanName(subscription, productNames),
          currentPeriodEnd,
          cancelAtPeriodEnd,
          canceledAt: this.fromUnix(subscription.canceled_at),
          ...(eventType ? { lastEventType: eventType } : {}),
          ...(shouldDispatchAutomation && automationDedupeKey
            ? { lastAutomationDedupeKey: automationDedupeKey }
            : {}),
        },
      });

      if (shouldDispatchAutomation && eventType) {
        await dispatchSubscriptionStripeTrigger(
          this.dispatchDeps(),
          userId,
          connectionId,
          eventType,
          subscription.id,
          stripeCustomerId,
        );

        await this.botStartSettings.tryAutoRemoveExpiredSubscriber({
          userId,
          connectionId,
          triggerType: eventType,
          stripeSubscriptionId: subscription.id,
          stripeCustomerId,
        });
      }

      if (shouldRevokeStripeTelegramMemberLinkForSubscription({
          status,
          cancelAtPeriodEnd: subscription.cancel_at_period_end === true,
        })
      ) {
        await revokeStripeTelegramMemberLinks(this.prisma, {
          connectionId,
          stripeSubscriptionId: subscription.id,
          stripeCustomerId,
        });
      } else if (isEntitledStripeSubscription({ status })) {
        await reactivateStripeTelegramMemberLinks(this.prisma, {
          connectionId,
          stripeSubscriptionId: subscription.id,
          stripeCustomerId,
        });
      }
    }

    return syncedSubscriptionIds;
  }

  private async ensureCustomer(
    userId: string,
    connectionId: string,
    subscription: StripeSubscriptionRecord,
    customersByStripeId: Map<string, string>,
  ) {
    const customerSnapshot = getStripeCustomerSnapshot(subscription.customer);
    if (!customerSnapshot || customersByStripeId.has(customerSnapshot.id))
      return;

    const customer = await this.prisma.stripeBillingCustomers.upsert({
      where: {
        connectionId_stripeCustomerId: {
          connectionId,
          stripeCustomerId: customerSnapshot.id,
        },
      },
      create: {
        userId,
        connectionId,
        stripeCustomerId: customerSnapshot.id,
        name: customerSnapshot.name ?? null,
        email: customerSnapshot.email?.toLowerCase() ?? null,
      },
      update: {
        name: customerSnapshot.name ?? null,
        email: customerSnapshot.email?.toLowerCase() ?? null,
      },
      select: { id: true },
    });
    customersByStripeId.set(customerSnapshot.id, customer.id);
  }

  private async syncInvoices(
    userId: string,
    connectionId: string,
    invoices: StripeInvoiceRecord[],
    customersByStripeId: Map<string, string>,
    options?: { stripeWebhookEventType?: string },
  ) {
    const syncedInvoiceIds: string[] = [];

    for (const invoice of invoices.filter((row) => row.id)) {
      syncedInvoiceIds.push(invoice.id);
      const status = invoice.status ?? 'unknown';

      const existing = await this.prisma.stripeBillingPayments.findUnique({
        where: {
          connectionId_stripeInvoiceId: {
            connectionId,
            stripeInvoiceId: invoice.id,
          },
        },
        select: { status: true, lastAutomationDedupeKey: true },
      });
      const previousStatus = existing?.status;

      await this.prisma.stripeBillingPayments.upsert({
        where: {
          connectionId_stripeInvoiceId: {
            connectionId,
            stripeInvoiceId: invoice.id,
          },
        },
        create: this.buildPaymentData(
          userId,
          connectionId,
          invoice,
          customersByStripeId,
        ),
        update: this.buildPaymentData(
          userId,
          connectionId,
          invoice,
          customersByStripeId,
        ),
      });

      const paymentTrigger = resolveInvoicePaymentTrigger(
        status,
        options?.stripeWebhookEventType,
      );
      const automationDedupeKey = paymentTrigger
        ? buildInvoiceAutomationDedupeKey(paymentTrigger, invoice.id)
        : null;
      const shouldDispatchStatus = shouldDispatchInvoicePaymentTrigger(
        paymentTrigger,
        previousStatus,
        status,
        options,
      );
      const shouldDispatchAutomation =
        shouldDispatchStatus &&
        Boolean(automationDedupeKey) &&
        shouldDispatchStripeAutomation(
          existing?.lastAutomationDedupeKey,
          automationDedupeKey!,
        );

      if (shouldDispatchAutomation && paymentTrigger && automationDedupeKey) {
        const stripeCustomerId = getStripeCustomerId(invoice.customer);
        await processInvoiceStripeEvent(
          this.dispatchDeps(),
          userId,
          connectionId,
          status,
          invoice.id,
          stripeCustomerId,
        );
        await this.prisma.stripeBillingPayments.update({
          where: {
            connectionId_stripeInvoiceId: {
              connectionId,
              stripeInvoiceId: invoice.id,
            },
          },
          data: { lastAutomationDedupeKey: automationDedupeKey },
        });
      }
    }

    return syncedInvoiceIds;
  }

  private buildPaymentData(
    userId: string,
    connectionId: string,
    invoice: StripeInvoiceRecord,
    customersByStripeId: Map<string, string>,
  ) {
    const stripeCustomerId = getStripeCustomerId(invoice.customer);
    const status = invoice.status ?? 'unknown';
    const paidAt =
      this.fromUnix(invoice.status_transitions?.paid_at) ??
      (status === 'paid' ? this.fromUnix(invoice.created) : null);

    return {
      userId,
      connectionId,
      customerId: stripeCustomerId
        ? customersByStripeId.get(stripeCustomerId)
        : undefined,
      stripeInvoiceId: invoice.id,
      stripePaymentIntentId: getStripePaymentIntentId(invoice.payment_intent),
      stripeCustomerId,
      status,
      amountCents: invoice.amount_paid ?? invoice.amount_due ?? 0,
      currency: invoice.currency ?? 'usd',
      paidAt,
    };
  }

  private async updateConnectionMetrics(connectionId: string) {
    const now = new Date();
    const expiringUntil = new Date(
      now.getTime() + EXPIRING_WINDOW_DAYS * 86_400_000,
    );
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      customerCount,
      activeCount,
      expiringCount,
      expiredCount,
      monthlyRevenue,
    ] = await Promise.all([
      this.prisma.stripeBillingCustomers.count({ where: { connectionId } }),
      this.prisma.stripeBillingSubscriptions.count({
        where: { connectionId, status: { in: ['active', 'trialing'] } },
      }),
      this.prisma.stripeBillingSubscriptions.count({
        where: {
          connectionId,
          status: { in: ['active', 'trialing'] },
          currentPeriodEnd: { gte: now, lte: expiringUntil },
        },
      }),
      this.prisma.stripeBillingSubscriptions.count({
        where: {
          connectionId,
          status: { in: ['canceled', 'unpaid', 'incomplete_expired'] },
        },
      }),
      this.prisma.stripeBillingPayments.aggregate({
        where: { connectionId, status: 'paid', paidAt: { gte: startOfMonth } },
        _sum: { amountCents: true },
      }),
    ]);

    await this.prisma.stripeBillingConnections.update({
      where: { id: connectionId },
      data: {
        lastSyncedAt: now,
        customerCount,
        activeSubscriptionCount: activeCount,
        expiringSubscriptionCount: expiringCount,
        expiredSubscriptionCount: expiredCount,
        monthlyRevenueCents: monthlyRevenue._sum.amountCents ?? 0,
      },
    });
  }

  private getPlanName(
    subscription: StripeSubscriptionRecord,
    productNames: Map<string, string>,
  ): string | null {
    const price = subscription.items?.data?.[0]?.price;
    if (!price) return null;
    if (price.nickname?.trim()) return price.nickname.trim();
    const product = price.product;
    if (typeof product === 'object' && product?.name) return product.name;
    if (typeof product === 'string') return productNames.get(product) ?? null;
    return null;
  }

  private fromUnix(value: number | null | undefined): Date | null {
    return typeof value === 'number' && Number.isFinite(value)
      ? new Date(value * 1000)
      : null;
  }
}

const connectionSelect = {
  id: true,
  stripeAccountId: true,
  apiKeyLast4: true,
  encryptedWebhookSigningSecret: true,
  status: true,
  lastSyncedAt: true,
  consentAcceptedAt: true,
  disconnectedAt: true,
  activeSubscriptionCount: true,
  expiringSubscriptionCount: true,
  expiredSubscriptionCount: true,
  customerCount: true,
  monthlyRevenueCents: true,
  monitoredStripePriceId: true,
  monitoredStripeProductId: true,
  monitoredPlanLabel: true,
  telegramGroupId: true,
  updatedAt: true,
  group: {
    select: {
      id: true,
      title: true,
    },
  },
} as const;

type ConnectionRow = Prisma.StripeBillingConnectionsGetPayload<{
  select: typeof connectionSelect;
}>;

type CheckoutButtonResult = {
  connectionId: string;
  label: string;
  url: string;
};

@Injectable()
export class StripeBillingService {
  private readonly logger = new Logger(StripeBillingService.name);
  private readonly devCheckoutReconcileLoops = new Set<string>();

  private static readonly DEV_CHECKOUT_RECONCILE_INTERVAL_MS = 3_000;
  private static readonly DEV_CHECKOUT_RECONCILE_MAX_MS = 15 * 60_000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly sync: StripeBillingSyncService,
    private readonly config: ConfigService,
    private readonly telegram: TelegramService,
    private readonly groupLimit: GroupLimitService,
  ) {}

  async getStatus(userId: string, requestHeaders?: IncomingHttpHeaders) {
    return this.buildStatusPayload(userId, requestHeaders);
  }

  async listConnectionOptions(
    userId: string,
    requestHeaders?: IncomingHttpHeaders,
  ) {
    const connections = await this.prisma.stripeBillingConnections.findMany({
      where: {
        userId,
        status: StripeBillingConnectionStatus.CONNECTED,
      },
      select: connectionSelect,
      orderBy: { createdAt: 'asc' },
    });

    return {
      connections: connections.map((connection) =>
        this.mapConnectionForResponse(
          {
            ...connection,
            receivedPaymentCount: 0,
            failedPaymentCount: 0,
          },
          requestHeaders,
        ),
      ),
    };
  }

  async previewCatalog(
    _userId: string,
    input: StripeBillingPreviewCatalogInput,
  ) {
    const client = new StripeBillingStripeClient(input.apiKey.trim());
    await client.getAccount();
    const prices = await client.listRecurringPrices();

    const catalog = prices
      .filter((price) => price.active !== false)
      .map((price) => client.mapCatalogPrice(price))
      .filter((price) => price.productId)
      .sort((left, right) => left.label.localeCompare(right.label, 'pt-BR'));

    if (catalog.length === 0) {
      throw new BadRequestException(
        'Nenhum plano recorrente ativo foi encontrado nesta conta Stripe.',
      );
    }

    return { prices: catalog };
  }

  async connect(
    userId: string,
    input: StripeBillingConnectInput,
    requestHeaders?: IncomingHttpHeaders,
  ) {
    const apiKey = input.apiKey.trim();
    const client = new StripeBillingStripeClient(apiKey);
    const [account, selectedPrice] = await Promise.all([
      client.getAccount(),
      client.getPrice(input.stripePriceId),
    ]);

    if (selectedPrice.active === false || selectedPrice.type !== 'recurring') {
      throw new BadRequestException(
        'O plano selecionado não está disponível para monitoramento.',
      );
    }

    const mappedPrice = client.mapCatalogPrice(selectedPrice);
    if (!mappedPrice.productId) {
      throw new BadRequestException(
        'Não foi possível identificar o produto do plano selecionado.',
      );
    }

    await this.assertCanConnectPlan(userId, mappedPrice.id);
    await this.assertOwnedGroup(userId, input.telegramGroupId);
    await this.assertCanLinkGroup(userId, input.telegramGroupId);

    const consentAcceptedAt = new Date();
    const connectionData = {
      stripeAccountId: account.id,
      encryptedApiKey: encryptSecretValue(apiKey),
      apiKeyLast4: apiKey.slice(-4),
      ...(input.webhookSigningSecret
        ? {
            encryptedWebhookSigningSecret: encryptSecretValue(
              input.webhookSigningSecret.trim(),
            ),
          }
        : {}),
      status: StripeBillingConnectionStatus.CONNECTED,
      consentAcceptedAt,
      disconnectedAt: null,
      monitoredStripePriceId: mappedPrice.id,
      monitoredStripeProductId: mappedPrice.productId,
      monitoredPlanLabel: mappedPrice.label,
      telegramGroupId: input.telegramGroupId,
    };

    let connection: { id: string; apiKeyLast4: string };

    try {
      connection = await this.prisma.stripeBillingConnections.create({
        data: {
          userId,
          ...connectionData,
        },
        select: { id: true, apiKeyLast4: true },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Este plano já possui uma chave Stripe ativa. Desconecte a integração do plano antes de conectar outra chave para ele.',
        );
      }
      throw error;
    }

    await this.sync.recordAudit(userId, connection.id, 'CONSENT_ACCEPTED', {
      stripeAccountId: account.id,
      stripePriceId: mappedPrice.id,
    });
    await this.sync.recordAudit(userId, connection.id, 'CONNECTION_CREATED', {
      stripeAccountId: account.id,
      apiKeyLast4: connection.apiKeyLast4,
      stripePriceId: mappedPrice.id,
      monitoredPlanLabel: mappedPrice.label,
    });
    await this.sync.syncConnection(userId, connection.id);

    return this.getStatus(userId, requestHeaders);
  }

  async updateLinkedGroup(
    userId: string,
    connectionId: string,
    input: StripeBillingUpdateLinkedGroupInput,
    requestHeaders?: IncomingHttpHeaders,
  ) {
    await this.getOwnedConnection(userId, connectionId);
    await this.assertOwnedGroup(userId, input.telegramGroupId);
    await this.assertCanLinkGroup(userId, input.telegramGroupId, connectionId);

    await this.prisma.stripeBillingConnections.update({
      where: { id: connectionId },
      data: { telegramGroupId: input.telegramGroupId },
    });

    return this.getStatus(userId, requestHeaders);
  }

  async updateWebhookSecret(
    userId: string,
    connectionId: string,
    input: StripeBillingUpdateWebhookSecretInput,
    requestHeaders?: IncomingHttpHeaders,
  ) {
    await this.getOwnedConnection(userId, connectionId);

    await this.prisma.stripeBillingConnections.update({
      where: { id: connectionId },
      data: {
        encryptedWebhookSigningSecret: encryptSecretValue(
          input.webhookSigningSecret.trim(),
        ),
      },
    });

    return this.getStatus(userId, requestHeaders);
  }

  async syncNow(
    userId: string,
    connectionId: string,
    requestHeaders?: IncomingHttpHeaders,
  ) {
    await this.getOwnedConnection(userId, connectionId);
    await this.sync.syncConnection(userId, connectionId);
    await this.reconcilePendingSessions(connectionId);
    return this.getStatus(userId, requestHeaders);
  }

  async syncAllProducts(
    userId: string,
    requestHeaders?: IncomingHttpHeaders,
  ) {
    const connections = await this.prisma.stripeBillingConnections.findMany({
      where: {
        userId,
        status: StripeBillingConnectionStatus.CONNECTED,
      },
      select: { id: true },
      orderBy: { createdAt: 'asc' },
    });

    let refreshedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const connection of connections) {
      const result = await this.sync.refreshConnectionProductMetadata(
        userId,
        connection.id,
      );

      if (result === 'refreshed') {
        refreshedCount += 1;
      } else if (result === 'skipped') {
        skippedCount += 1;
      } else {
        failedCount += 1;
      }
    }

    const status = await this.getStatus(userId, requestHeaders);

    return {
      ...status,
      productsSync: {
        refreshedCount,
        skippedCount,
        failedCount,
      },
    };
  }

  async disconnect(
    userId: string,
    connectionId: string,
    requestHeaders?: IncomingHttpHeaders,
  ) {
    const connection = await this.getOwnedConnection(userId, connectionId);

    if (connection.status !== StripeBillingConnectionStatus.CONNECTED) {
      return this.getStatus(userId, requestHeaders);
    }

    await this.prisma.$transaction([
      this.prisma.stripeBillingConnections.update({
        where: { id: connection.id },
        data: {
          status: StripeBillingConnectionStatus.DISCONNECTED,
          encryptedApiKey: encryptSecretValue('disconnected'),
          encryptedWebhookSigningSecret: null,
          disconnectedAt: new Date(),
          monitoredStripePriceId: null,
          monitoredStripeProductId: null,
          monitoredPlanLabel: null,
          telegramGroupId: null,
        },
      }),
      this.prisma.stripeBillingPayments.deleteMany({
        where: { connectionId: connection.id },
      }),
      this.prisma.stripeBillingSubscriptions.deleteMany({
        where: { connectionId: connection.id },
      }),
      this.prisma.stripeBillingCustomers.deleteMany({
        where: { connectionId: connection.id },
      }),
    ]);
    await this.sync.recordAudit(userId, connection.id, 'CONNECTION_REMOVED');

    return this.getStatus(userId, requestHeaders);
  }

  async createCheckoutButtonsForStart(input: {
    publicStartToken: string;
    telegramUserId: string;
    telegramGroupId?: string;
  }): Promise<CheckoutButtonResult[]> {
    const settings = await this.prisma.telegramUserSettings.findUnique({
      where: { publicStartToken: input.publicStartToken.trim() },
      select: {
        userId: true,
        showPaymentButtons: true,
        paymentButtonConnectionIds: true,
      },
    });

    if (!settings?.showPaymentButtons) {
      return [];
    }

    let connections = await this.resolvePaymentConnections(
      settings.userId,
      settings.paymentButtonConnectionIds,
    );

    if (input.telegramGroupId) {
      const groupId = input.telegramGroupId.trim();
      const ownedGroup = await this.prisma.telegramGroups.findFirst({
        where: { id: groupId, userId: settings.userId },
        select: { id: true },
      });

      if (!ownedGroup) {
        throw new BadRequestException(
          'Grupo inválido para este link de /start.',
        );
      }

      connections = connections.filter(
        (connection) => connection.telegramGroupId === groupId,
      );
    }

    if (connections.length === 0) {
      return [];
    }

    const buttons: CheckoutButtonResult[] = [];
    for (const connection of connections) {
      const priceId = connection.monitoredStripePriceId;
      if (!priceId) continue;

      const telegramGroupId = connection.telegramGroupId;
      if (!telegramGroupId) {
        this.logger.warn(
          `Skipping checkout button for connection ${connection.id}: missing linked group.`,
        );
        continue;
      }

      const label =
        connection.monitoredPlanLabel?.trim() || priceId || 'Assinar plano';
      const button = await this.createTelegramCheckoutSession({
        userId: settings.userId,
        connectionId: connection.id,
        telegramUserId: input.telegramUserId,
        telegramGroupId,
        stripePriceId: priceId,
        label,
      });
      buttons.push(button);
    }

    if (buttons.length === 0) {
      throw new BadRequestException(
        input.telegramGroupId
          ? 'Nenhum plano disponível para este grupo.'
          : 'Vincule um grupo a cada plano Stripe em Integrações para habilitar os botões de pagamento.',
      );
    }

    return buttons;
  }

  async listPaymentGroupsForStart(input: {
    publicStartToken: string;
  }): Promise<Array<{ id: string; title: string }>> {
    const settings = await this.prisma.telegramUserSettings.findUnique({
      where: { publicStartToken: input.publicStartToken.trim() },
      select: {
        userId: true,
        showPaymentButtons: true,
        paymentButtonsGroupFirst: true,
        paymentButtonConnectionIds: true,
      },
    });

    if (!settings?.showPaymentButtons || !settings.paymentButtonsGroupFirst) {
      return [];
    }

    const connections = await this.resolvePaymentConnections(
      settings.userId,
      settings.paymentButtonConnectionIds,
    );

    const groups = new Map<string, string>();
    for (const connection of connections) {
      if (!connection.telegramGroupId || !connection.group) {
        continue;
      }

      groups.set(
        connection.telegramGroupId,
        connection.group.title?.trim() || 'Sem título',
      );
    }

    return Array.from(groups.entries())
      .map(([id, title]) => ({ id, title }))
      .sort((left, right) => left.title.localeCompare(right.title, 'pt-BR'));
  }

  async createCancelPortalsForTelegramUser(telegramUserId: string) {
    const links = await this.prisma.stripeTelegramMemberLinks.findMany({
      where: {
        telegramUserId: telegramUserId.trim(),
        status: {
          in: [
            StripeTelegramMemberLinkStatus.ACTIVE,
            StripeTelegramMemberLinkStatus.REVOKED,
          ],
        },
      },
      orderBy: { linkedAt: 'desc' },
      select: {
        connectionId: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        status: true,
        connection: {
          select: {
            status: true,
            monitoredPlanLabel: true,
          },
        },
        group: {
          select: {
            title: true,
          },
        },
      },
    });

    if (links.length === 0) {
      throw new NotFoundException(
        'Não encontramos assinatura vinculada a este Telegram. Se você assinou recentemente, aguarde alguns minutos e tente de novo.',
      );
    }

    const connectedLinks = links.filter(
      (link) =>
        link.connection.status === StripeBillingConnectionStatus.CONNECTED,
    );

    const uniqueLinks = new Map<string, (typeof links)[number]>();
    for (const link of connectedLinks) {
      const dedupeKey = `${link.connectionId}:${link.stripeCustomerId}`;
      const existing = uniqueLinks.get(dedupeKey);
      if (!existing) {
        uniqueLinks.set(dedupeKey, link);
        continue;
      }

      if (
        existing.status !== StripeTelegramMemberLinkStatus.ACTIVE &&
        link.status === StripeTelegramMemberLinkStatus.ACTIVE
      ) {
        uniqueLinks.set(dedupeKey, link);
      }
    }

    const subscriptionRows =
      uniqueLinks.size > 0
        ? await this.prisma.stripeBillingSubscriptions.findMany({
            where: {
              OR: Array.from(uniqueLinks.values()).map((link) => ({
                connectionId: link.connectionId,
                stripeCustomerId: link.stripeCustomerId,
              })),
            },
            select: {
              connectionId: true,
              stripeCustomerId: true,
              stripeSubscriptionId: true,
              status: true,
              cancelAtPeriodEnd: true,
              planName: true,
            },
            orderBy: { updatedAt: 'desc' },
          })
        : [];

    const subscriptionsByCustomerKey = new Map<
      string,
      (typeof subscriptionRows)[number][]
    >();
    for (const subscription of subscriptionRows) {
      const key = `${subscription.connectionId}:${subscription.stripeCustomerId}`;
      const existing = subscriptionsByCustomerKey.get(key) ?? [];
      existing.push(subscription);
      subscriptionsByCustomerKey.set(key, existing);
    }

    const returnUrl = this.getTelegramBotPublicUrl();
    const options: Array<{ url: string; label: string }> = [];

    for (const [dedupeKey, link] of uniqueLinks) {
      const subscriptions = subscriptionsByCustomerKey.get(dedupeKey) ?? [];
      if (
        !canOpenStripeSubscriptionCancelPortal(subscriptions, {
          status: link.status,
          stripeSubscriptionId: link.stripeSubscriptionId,
        })
      ) {
        continue;
      }

      const subscription = pickStripeSubscriptionForCancel(
        subscriptions,
        link.stripeSubscriptionId,
      );

      try {
        const client = await this.getClientForConnection(link.connectionId);
        const session = await client.createBillingPortalSession({
          customer: link.stripeCustomerId,
          returnUrl,
        });

        if (!session.url) {
          continue;
        }

        options.push({
          url: session.url,
          label:
            subscription?.planName?.trim() ||
            link.connection.monitoredPlanLabel?.trim() ||
            link.group.title?.trim() ||
            'Gerenciar assinatura',
        });
      } catch (error) {
        this.logger.warn(
          `Failed to create billing portal for telegram user ${telegramUserId} on connection ${link.connectionId}: ${error instanceof Error ? error.message : 'unknown'}`,
        );
      }
    }

    if (options.length === 0) {
      const hasEndedSubscriptions =
        uniqueLinks.size > 0 &&
        Array.from(uniqueLinks.keys()).every((dedupeKey) => {
          const link = uniqueLinks.get(dedupeKey);
          const subscriptions = subscriptionsByCustomerKey.get(dedupeKey) ?? [];
          return (
            !link ||
            !canOpenStripeSubscriptionCancelPortal(subscriptions, {
              status: link.status,
              stripeSubscriptionId: link.stripeSubscriptionId,
            })
          );
        });

      if (hasEndedSubscriptions) {
        throw new NotFoundException(
          'Não encontramos assinatura ativa vinculada a este Telegram. Se você já cancelou, não é necessário usar este comando.',
        );
      }

      throw new BadRequestException(
        'Não foi possível abrir o portal de cancelamento. O criador precisa ativar o Customer Portal na conta Stripe (Settings → Billing → Customer portal).',
      );
    }

    return { options };
  }

  async finalizeCheckoutSession(
    sessionId: string,
  ): Promise<{ success: true; telegramBotUrl: string }> {
    const pending = await this.prisma.stripeTelegramCheckoutSessions.findUnique(
      {
        where: { stripeCheckoutSessionId: sessionId },
      },
    );

    if (!pending) {
      throw new NotFoundException('Sessão de checkout não encontrada.');
    }

    if (pending.status === StripeTelegramCheckoutStatus.COMPLETED) {
      return {
        success: true,
        telegramBotUrl: this.getTelegramBotPublicUrl(),
      };
    }

    const client = await this.getClientForConnection(pending.connectionId);
    const session = await client.retrieveCheckoutSession(sessionId);

    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      throw new BadRequestException('O pagamento ainda não foi concluído.');
    }

    await this.completeCheckoutRecord(pending.id, session);

    return {
      success: true,
      telegramBotUrl: this.getTelegramBotPublicUrl(),
    };
  }

  async reconcilePendingSessions(connectionId: string): Promise<void> {
    const pendingSessions =
      await this.prisma.stripeTelegramCheckoutSessions.findMany({
        where: {
          connectionId,
          status: StripeTelegramCheckoutStatus.PENDING,
        },
        take: 20,
        orderBy: { createdAt: 'desc' },
      });

    if (pendingSessions.length === 0) return;

    const client = await this.getClientForConnection(connectionId);
    for (const pending of pendingSessions) {
      try {
        const session = await client.retrieveCheckoutSession(
          pending.stripeCheckoutSessionId,
        );
        if (
          session.payment_status === 'paid' ||
          session.status === 'complete'
        ) {
          await this.completeCheckoutRecord(pending.id, session);
        } else if (session.status === 'expired') {
          await this.prisma.stripeTelegramCheckoutSessions.update({
            where: { id: pending.id },
            data: { status: StripeTelegramCheckoutStatus.EXPIRED },
          });
        }
      } catch (error) {
        this.logger.warn(
          `Failed to reconcile checkout ${pending.stripeCheckoutSessionId}: ${error instanceof Error ? error.message : 'unknown'}`,
        );
      }
    }
  }

  private async createTelegramCheckoutSession(input: {
    userId: string;
    connectionId: string;
    telegramUserId: string;
    telegramGroupId: string;
    stripePriceId: string;
    label: string;
  }): Promise<CheckoutButtonResult> {
    const client = await this.getClientForConnection(input.connectionId);
    const redirectUrls = this.resolveCheckoutRedirectUrls();

    if (redirectUrls.mode === 'telegram_fallback') {
      this.logger.log(
        'Checkout em ambiente local: após pagar, o usuário volta ao Telegram e a API reconcilia a sessão automaticamente.',
      );
    }

    const session = await client.createCheckoutSession({
      priceId: input.stripePriceId,
      successUrl: redirectUrls.successUrl,
      cancelUrl: redirectUrls.cancelUrl,
      metadata: {
        gateon_user_id: input.userId,
        gateon_connection_id: input.connectionId,
        telegram_user_id: input.telegramUserId,
        telegram_group_id: input.telegramGroupId,
      },
    });

    if (!session.id || !session.url) {
      throw new BadRequestException(
        'Não foi possível gerar o link de pagamento na Stripe.',
      );
    }

    const checkoutRecord =
      await this.prisma.stripeTelegramCheckoutSessions.create({
        data: {
          userId: input.userId,
          connectionId: input.connectionId,
          telegramUserId: input.telegramUserId,
          telegramGroupId: input.telegramGroupId,
          stripeCheckoutSessionId: session.id,
          stripePriceId: input.stripePriceId,
        },
      });

    if (
      redirectUrls.shouldAutoReconcile &&
      this.isDevAutoReconcileCheckoutEnabled()
    ) {
      this.scheduleDevCheckoutReconciliation(
        input.connectionId,
        checkoutRecord.id,
      );
    }

    return {
      connectionId: input.connectionId,
      label: input.label,
      url: session.url,
    };
  }

  private async completeCheckoutRecord(
    checkoutRecordId: string,
    session: StripeCheckoutSessionRecord,
  ) {
    const pending = await this.prisma.stripeTelegramCheckoutSessions.findUnique(
      {
        where: { id: checkoutRecordId },
      },
    );

    if (!pending || pending.status === StripeTelegramCheckoutStatus.COMPLETED) {
      return;
    }

    const stripeCustomerId = getStripeCustomerId(session.customer);
    const stripeSubscriptionId = getStripeSubscriptionId(session.subscription);
    const telegramGroupId = pending.telegramGroupId;

    if (!stripeCustomerId || !telegramGroupId) {
      await this.prisma.stripeTelegramCheckoutSessions.update({
        where: { id: pending.id },
        data: { status: StripeTelegramCheckoutStatus.FAILED },
      });
      return;
    }

    const connection = await this.prisma.stripeBillingConnections.findUnique({
      where: { id: pending.connectionId },
      select: { monitoredPlanLabel: true },
    });

    await this.prisma.$transaction(async (tx) => {
      await tx.stripeTelegramCheckoutSessions.update({
        where: { id: pending.id },
        data: {
          status: StripeTelegramCheckoutStatus.COMPLETED,
          stripeCustomerId,
          stripeSubscriptionId,
          completedAt: new Date(),
        },
      });

      await tx.stripeTelegramMemberLinks.upsert({
        where: {
          connectionId_telegramUserId: {
            connectionId: pending.connectionId,
            telegramUserId: pending.telegramUserId,
          },
        },
        create: {
          userId: pending.userId,
          connectionId: pending.connectionId,
          telegramGroupId,
          telegramUserId: pending.telegramUserId,
          stripeCustomerId,
          stripeSubscriptionId,
          status: StripeTelegramMemberLinkStatus.ACTIVE,
        },
        update: {
          telegramGroupId,
          stripeCustomerId,
          stripeSubscriptionId,
          status: StripeTelegramMemberLinkStatus.ACTIVE,
        },
      });

      if (stripeSubscriptionId) {
        const customer = await tx.stripeBillingCustomers.findUnique({
          where: {
            connectionId_stripeCustomerId: {
              connectionId: pending.connectionId,
              stripeCustomerId,
            },
          },
          select: { id: true },
        });

        await tx.stripeBillingSubscriptions.upsert({
          where: {
            connectionId_stripeSubscriptionId: {
              connectionId: pending.connectionId,
              stripeSubscriptionId,
            },
          },
          create: {
            userId: pending.userId,
            connectionId: pending.connectionId,
            customerId: customer?.id,
            stripeSubscriptionId,
            stripeCustomerId,
            status: 'active',
            planName: connection?.monitoredPlanLabel ?? null,
            cancelAtPeriodEnd: false,
          },
          update: {
            customerId: customer?.id,
            stripeCustomerId,
            status: 'active',
            planName: connection?.monitoredPlanLabel ?? null,
            cancelAtPeriodEnd: false,
            canceledAt: null,
          },
        });
      }

      await tx.stripeBillingAuditLogs.create({
        data: {
          userId: pending.userId,
          connectionId: pending.connectionId,
          action: StripeBillingAuditAction.TELEGRAM_MEMBER_LINKED,
          metadata: {
            telegramUserId: pending.telegramUserId,
            telegramGroupId: pending.telegramGroupId,
            stripeCustomerId,
            stripeSubscriptionId,
            checkoutSessionId: pending.stripeCheckoutSessionId,
          },
        },
      });
    });

    await this.notifySubscriberAccessGranted({
      telegramUserId: pending.telegramUserId,
      telegramGroupId,
    });
  }

  private async notifySubscriberAccessGranted(input: {
    telegramUserId: string;
    telegramGroupId: string;
  }) {
    const group = await this.prisma.telegramGroups.findUnique({
      where: { id: input.telegramGroupId },
      select: { telegramChatId: true, title: true },
    });

    if (!group) return;

    const invite = await this.telegram.createChatInviteLink({
      chatId: group.telegramChatId,
      name: 'Gateon � acesso após pagamento',
      memberLimit: 1,
    });

    if (!invite.ok) {
      this.logger.warn(
        `Could not create invite link for group ${input.telegramGroupId}: ${invite.reason}`,
      );
      await this.telegram.sendAlertDm({
        telegramUserId: input.telegramUserId,
        text: [
          'Pagamento confirmado!',
          '',
          `Peça ao administrador do grupo "${group.title ?? 'conectado'}" para adicioná-lo manualmente.`,
        ].join('\n'),
      });
      return;
    }

    await this.telegram.sendAlertDm({
      telegramUserId: input.telegramUserId,
      text: [
        'Pagamento confirmado! Seu acesso foi vinculado.',
        '',
        `Entre no grupo "${group.title ?? 'conectado'}" pelo link abaixo:`,
        invite.inviteLink,
      ].join('\n'),
    });
  }

  private async resolvePaymentConnections(
    userId: string,
    selectedConnectionIds: string[],
  ) {
    const connections = await this.prisma.stripeBillingConnections.findMany({
      where: {
        userId,
        status: StripeBillingConnectionStatus.CONNECTED,
        monitoredStripePriceId: { not: null },
      },
      select: {
        id: true,
        monitoredPlanLabel: true,
        monitoredStripePriceId: true,
        telegramGroupId: true,
        group: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (selectedConnectionIds.length === 0) {
      return connections;
    }

    const selected = new Set(selectedConnectionIds);
    return connections.filter((connection) => selected.has(connection.id));
  }

  private async getClientForConnection(connectionId: string) {
    const connection = await this.prisma.stripeBillingConnections.findUnique({
      where: { id: connectionId },
      select: { encryptedApiKey: true, status: true },
    });

    if (
      !connection ||
      connection.status !== StripeBillingConnectionStatus.CONNECTED
    ) {
      throw new NotFoundException('Integração Stripe não encontrada.');
    }

    const apiKey = decryptSecretValue(connection.encryptedApiKey);
    return new StripeBillingStripeClient(apiKey);
  }

  private getWebBaseUrl(): string {
    const base =
      this.config.get<string>('WEB_BASE_URL')?.trim() ||
      'http://localhost:3000';
    return base.replace(/\/$/, '');
  }

  private resolveCheckoutRedirectUrls() {
    return resolveStripeCheckoutRedirectUrls({
      webBaseUrl: this.getWebBaseUrl(),
      publicBaseUrl: this.config.get<string>('STRIPE_CHECKOUT_PUBLIC_BASE_URL'),
      telegramBotPublicUrl: this.getTelegramBotPublicUrl(),
      isProduction: process.env.NODE_ENV === 'production',
    });
  }

  private isDevAutoReconcileCheckoutEnabled(): boolean {
    return (
      this.config.get<string>('STRIPE_DEV_AUTO_RECONCILE_CHECKOUT') !== 'false'
    );
  }

  private scheduleDevCheckoutReconciliation(
    connectionId: string,
    checkoutRecordId: string,
  ) {
    if (process.env.NODE_ENV === 'production') {
      return;
    }

    const loopKey = `${connectionId}:${checkoutRecordId}`;
    if (this.devCheckoutReconcileLoops.has(loopKey)) {
      return;
    }
    this.devCheckoutReconcileLoops.add(loopKey);

    const startedAt = Date.now();

    const tick = async () => {
      if (
        Date.now() - startedAt >
        StripeBillingService.DEV_CHECKOUT_RECONCILE_MAX_MS
      ) {
        this.devCheckoutReconcileLoops.delete(loopKey);
        return;
      }

      const record =
        await this.prisma.stripeTelegramCheckoutSessions.findUnique({
          where: { id: checkoutRecordId },
          select: { status: true },
        });

      if (
        !record ||
        record.status === StripeTelegramCheckoutStatus.COMPLETED ||
        record.status === StripeTelegramCheckoutStatus.EXPIRED ||
        record.status === StripeTelegramCheckoutStatus.FAILED
      ) {
        this.devCheckoutReconcileLoops.delete(loopKey);
        return;
      }

      try {
        await this.reconcilePendingSessions(connectionId);
      } catch (error) {
        this.logger.warn(
          `Dev checkout reconcile failed for ${checkoutRecordId}: ${
            error instanceof Error ? error.message : 'unknown'
          }`,
        );
      }

      setTimeout(() => {
        void tick();
      }, StripeBillingService.DEV_CHECKOUT_RECONCILE_INTERVAL_MS);
    };

    void tick();
  }

  private getTelegramBotPublicUrl(): string {
    const raw = this.config.get<string>('TELEGRAM_BOT_USERNAME') ?? 'GateonBot';
    const username = raw.replace(/^@/, '').trim() || 'GateonBot';
    return `https://t.me/${username}`;
  }

  private async assertOwnedGroup(userId: string, groupId: string) {
    const count = await this.prisma.telegramGroups.count({
      where: { id: groupId, userId },
    });
    if (count === 0) {
      throw new BadRequestException('Grupo vinculado inválido.');
    }
  }

  private async assertCanLinkGroup(
    userId: string,
    telegramGroupId: string,
    excludeConnectionId?: string,
  ) {
    const connections = await this.prisma.stripeBillingConnections.findMany({
      where: {
        userId,
        status: StripeBillingConnectionStatus.CONNECTED,
        ...(excludeConnectionId ? { id: { not: excludeConnectionId } } : {}),
      },
      select: { id: true, telegramGroupId: true },
    });

    const planId = await this.groupLimit.resolvePlanId(userId);
    const maxDistinctGroups = getMaxStripePaymentGroupsForPlan(planId);
    const simulated = [
      ...connections,
      { id: excludeConnectionId ?? 'new', telegramGroupId },
    ];

    if (
      wouldExceedStripePaymentGroupLimitForLink({
        connections: simulated,
        connectionId: excludeConnectionId ?? 'new',
        nextGroupId: telegramGroupId,
        maxDistinctGroups,
      })
    ) {
      throw new ForbiddenException({
        error: STRIPE_PAYMENT_GROUP_LIMIT_REACHED_CODE,
        message: `Seu plano ${PLAN_LABELS[planId]} permite vincular até ${maxDistinctGroups} grupo(s) diferente(s) aos produtos Stripe.`,
        planId,
        maxDistinctGroups,
        usedDistinctGroups: countDistinctLinkedStripeGroups(
          simulated.map((connection) => ({
            telegramGroupId: connection.telegramGroupId,
          })),
        ),
      });
    }
  }

  private async assertCanConnectPlan(userId: string, stripePriceId: string) {
    const existing = await this.prisma.stripeBillingConnections.findFirst({
      where: {
        userId,
        monitoredStripePriceId: stripePriceId,
        status: StripeBillingConnectionStatus.CONNECTED,
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        'Este plano já possui uma chave Stripe ativa. Desconecte a integração do plano antes de conectar outra chave para ele.',
      );
    }
  }

  private async getOwnedConnection(userId: string, connectionId: string) {
    const connection = await this.prisma.stripeBillingConnections.findFirst({
      where: { id: connectionId, userId },
      select: { id: true, status: true },
    });

    if (!connection) {
      throw new NotFoundException('Integração Stripe não encontrada.');
    }

    return connection;
  }

  private async buildStatusPayload(
    userId: string,
    requestHeaders?: IncomingHttpHeaders,
  ) {
    const planId = await this.groupLimit.resolvePlanId(userId);
    const connections = await this.prisma.stripeBillingConnections.findMany({
      where: {
        userId,
        status: StripeBillingConnectionStatus.CONNECTED,
      },
      select: connectionSelect,
      orderBy: { createdAt: 'asc' },
    });

    const connectionsWithCounts = await Promise.all(
      connections.map((connection) =>
        this.enrichConnectionWithPaymentCounts(connection),
      ),
    );

    const usedDistinctGroups = countDistinctLinkedStripeGroups(connections);

    return {
      connected: connectionsWithCounts.length > 0,
      canConnect: true,
      connections: connectionsWithCounts.map((connection) =>
        this.mapConnectionForResponse(connection, requestHeaders),
      ),
      totals: this.aggregateTotals(connectionsWithCounts),
      stripePaymentGroupLimit: {
        planId,
        planLabel: PLAN_LABELS[planId],
        maxDistinctGroups: getMaxStripePaymentGroupsForPlan(planId),
        usedDistinctGroups,
      },
    };
  }

  private mapConnectionForResponse(
    connection: ConnectionRow & {
      receivedPaymentCount: number;
      failedPaymentCount: number;
    },
    requestHeaders?: IncomingHttpHeaders,
  ) {
    const { group, encryptedWebhookSigningSecret, ...rest } = connection;
    const webhookConfigured =
      Boolean(encryptedWebhookSigningSecret) ||
      Boolean(this.config.get<string>('STRIPE_WEBHOOK_SIGNING_SECRET')?.trim());

    return {
      ...rest,
      webhookConfigured,
      webhookEndpointUrl: buildStripeWebhookEndpointUrl(
        this.config,
        connection.id,
        requestHeaders,
      ),
      linkedGroup: group
        ? {
            id: group.id,
            title: group.title?.trim() || 'Grupo sem nome',
          }
        : null,
    };
  }

  private async enrichConnectionWithPaymentCounts(connection: ConnectionRow) {
    const [receivedPaymentCount, failedPaymentCount] = await Promise.all([
      this.prisma.stripeBillingPayments.count({
        where: { connectionId: connection.id, status: 'paid' },
      }),
      this.prisma.stripeBillingPayments.count({
        where: {
          connectionId: connection.id,
          status: { in: ['uncollectible', 'void'] },
        },
      }),
    ]);

    return {
      ...connection,
      receivedPaymentCount,
      failedPaymentCount,
    };
  }

  private aggregateTotals(
    connections: Array<
      ConnectionRow & {
        receivedPaymentCount: number;
        failedPaymentCount: number;
      }
    >,
  ) {
    return connections.reduce(
      (totals, connection) => ({
        activeSubscriptionCount:
          totals.activeSubscriptionCount + connection.activeSubscriptionCount,
        expiringSubscriptionCount:
          totals.expiringSubscriptionCount +
          connection.expiringSubscriptionCount,
        expiredSubscriptionCount:
          totals.expiredSubscriptionCount + connection.expiredSubscriptionCount,
        customerCount: totals.customerCount + connection.customerCount,
        monthlyRevenueCents:
          totals.monthlyRevenueCents + connection.monthlyRevenueCents,
        receivedPaymentCount:
          totals.receivedPaymentCount + connection.receivedPaymentCount,
        failedPaymentCount:
          totals.failedPaymentCount + connection.failedPaymentCount,
      }),
      {
        activeSubscriptionCount: 0,
        expiringSubscriptionCount: 0,
        expiredSubscriptionCount: 0,
        customerCount: 0,
        monthlyRevenueCents: 0,
        receivedPaymentCount: 0,
        failedPaymentCount: 0,
      },
    );
  }
}

type StripeWebhookEnvelope = {
  id?: string;
  type?: string;
  data?: {
    object?: Record<string, unknown>;
  };
};

@Injectable()
export class StripeBillingWebhookService {
  private readonly logger = new Logger(StripeBillingWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly sync: StripeBillingSyncService,
    private readonly stripeBilling: StripeBillingService,
  ) {}

  async handle(
    connectionId: string,
    signature: string | undefined,
    rawBody: Buffer,
  ): Promise<void> {
    const secret = await this.resolveSigningSecret(connectionId);
    if (!secret) {
      throw new BadRequestException(
        'Webhook não configurado para esta integração.',
      );
    }

    if (!verifyStripeWebhookSignature(rawBody, signature, secret)) {
      throw new BadRequestException('Assinatura do webhook inválida.');
    }

    let event: StripeWebhookEnvelope;
    try {
      event = JSON.parse(rawBody.toString('utf8')) as StripeWebhookEnvelope;
    } catch {
      throw new BadRequestException('Payload do webhook inválido.');
    }

    await this.processEvent(connectionId, event);
  }

  private async resolveSigningSecret(
    connectionId: string,
  ): Promise<string | null> {
    const connection = await this.prisma.stripeBillingConnections.findFirst({
      where: {
        id: connectionId,
        status: StripeBillingConnectionStatus.CONNECTED,
      },
      select: { encryptedWebhookSigningSecret: true },
    });

    if (connection?.encryptedWebhookSigningSecret) {
      try {
        return decryptSecretValue(connection.encryptedWebhookSigningSecret);
      } catch {
        return null;
      }
    }

    const fallback = this.config
      .get<string>('STRIPE_WEBHOOK_SIGNING_SECRET')
      ?.trim();
    return fallback || null;
  }

  private async processEvent(
    connectionId: string,
    event: StripeWebhookEnvelope,
  ): Promise<void> {
    const type = event.type?.trim();
    const object = event.data?.object;
    if (!type || !object) {
      return;
    }

    const stripeEventId = event.id?.trim();
    if (stripeEventId) {
      const claimed = await this.claimStripeWebhookEvent(
        connectionId,
        stripeEventId,
        type,
      );
      if (!claimed) {
        this.logger.debug(
          `Skipping duplicate Stripe webhook ${stripeEventId} (${type}) for connection ${connectionId}`,
        );
        return;
      }
    }

    try {
      switch (type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          await this.sync.applySubscriptionFromWebhook(
            connectionId,
            object as StripeSubscriptionRecord,
          );
          break;
        case 'invoice.paid':
        case 'invoice.payment_failed':
        case 'invoice.voided':
          await this.sync.applyInvoiceFromWebhook(
            connectionId,
            object as StripeInvoiceRecord,
            type,
          );
          break;
        case 'checkout.session.completed': {
          const sessionId =
            typeof object.id === 'string' ? object.id.trim() : '';
          if (!sessionId) {
            break;
          }
          try {
            await this.stripeBilling.finalizeCheckoutSession(sessionId);
          } catch (error) {
            this.logger.debug(
              `Ignored checkout.session.completed ${sessionId}: ${
                error instanceof Error ? error.message : 'unknown'
              }`,
            );
          }
          break;
        }
        default:
          break;
      }
    } catch (error) {
      this.logger.error(
        `Failed to process Stripe webhook ${type} for connection ${connectionId}: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
      throw error;
    }
  }

  private async claimStripeWebhookEvent(
    connectionId: string,
    stripeEventId: string,
    stripeEventType: string,
  ): Promise<boolean> {
    try {
      await this.prisma.stripeBillingProcessedWebhookEvents.create({
        data: {
          connectionId,
          stripeEventId,
          stripeEventType,
        },
      });
      return true;
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        return false;
      }
      throw error;
    }
  }
}
