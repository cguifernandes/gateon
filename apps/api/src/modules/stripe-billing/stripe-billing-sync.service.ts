import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StripeBillingAuditAction } from '@prisma/client';
import { decryptSecretValue } from '../../utils/utils';
import { AlertsService } from '../alerts/alerts.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  getStripeCustomerId,
  getStripeCustomerSnapshot,
  getStripePaymentIntentId,
  getStripeSubscriptionId,
  StripeBillingStripeClient,
  subscriptionIncludesPrice,
  type StripeCustomerRecord,
  type StripeInvoiceRecord,
  type StripeSubscriptionRecord,
} from './stripe-billing-stripe-client';
import {
  dispatchSubscriptionStripeTrigger,
  processInvoiceStripeEvent,
} from '../../lib/stripe-billing-alert-dispatch';
import {
  resolveInvoicePaymentTrigger,
  resolveSubscriptionStripeTrigger,
  STRIPE_EXPIRING_WINDOW_DAYS,
} from '../../lib/stripe-billing-sync-events';

const EXPIRING_WINDOW_DAYS = STRIPE_EXPIRING_WINDOW_DAYS;

@Injectable()
export class StripeBillingSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: AlertsService,
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

      return mapped.label;
    } catch {
      return fallbackLabel;
    }
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
      !subscriptionIncludesPrice(subscription, connection.monitoredStripePriceId)
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
        select: { status: true, currentPeriodEnd: true },
      });
      const status = subscription.status ?? 'unknown';
      const currentPeriodEnd = this.fromUnix(subscription.current_period_end);
      const eventType = resolveSubscriptionStripeTrigger(
        existing,
        status,
        currentPeriodEnd,
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
          cancelAtPeriodEnd: subscription.cancel_at_period_end === true,
          canceledAt: this.fromUnix(subscription.canceled_at),
          lastEventType: eventType,
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
          cancelAtPeriodEnd: subscription.cancel_at_period_end === true,
          canceledAt: this.fromUnix(subscription.canceled_at),
          lastEventType: eventType,
        },
      });

      if (eventType) {
        await dispatchSubscriptionStripeTrigger(
          this.dispatchDeps(),
          userId,
          connectionId,
          eventType,
          subscription.id,
          stripeCustomerId,
        );
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
        select: { status: true },
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
      const statusChanged = previousStatus !== status;
      const forcedFailedWebhook =
        options?.stripeWebhookEventType === 'invoice.payment_failed';
      const isWebhookDispatch = Boolean(options?.stripeWebhookEventType);
      const shouldDispatch =
        paymentTrigger &&
        (isWebhookDispatch
          ? statusChanged || forcedFailedWebhook || previousStatus === undefined
          : previousStatus !== undefined && statusChanged);
      if (shouldDispatch) {
        const stripeCustomerId = getStripeCustomerId(invoice.customer);
        await processInvoiceStripeEvent(
          this.dispatchDeps(),
          userId,
          connectionId,
          status,
          invoice.id,
          stripeCustomerId,
        );
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
