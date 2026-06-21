import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AlertTriggerType,
  Prisma,
  StripeBillingAuditAction,
} from '@prisma/client';
import { decryptSecretValue } from '../../utils/utils';
import { AlertsService } from '../alerts/alerts.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  getStripeCustomerId,
  getStripeCustomerSnapshot,
  getStripePaymentIntentId,
  StripeBillingStripeClient,
  subscriptionIncludesPrice,
  type StripeCustomerRecord,
  type StripeInvoiceRecord,
  type StripeSubscriptionRecord,
} from './stripe-billing-stripe-client';

const EXPIRING_WINDOW_DAYS = 7;

@Injectable()
export class StripeBillingSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: AlertsService,
  ) {}

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
      const eventType = this.resolveSubscriptionEvent(
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
        await this.recordSubscriptionEvent(
          userId,
          connectionId,
          eventType,
          subscription.id,
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
  ) {
    const syncedInvoiceIds: string[] = [];

    for (const invoice of invoices.filter((row) => row.id)) {
      syncedInvoiceIds.push(invoice.id);
      const status = invoice.status ?? 'unknown';

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

      if (status === 'paid') {
        await this.recordAudit(userId, connectionId, 'PAYMENT_IDENTIFIED', {
          stripeInvoiceId: invoice.id,
        });
        await this.triggerAutomation(
          userId,
          connectionId,
          AlertTriggerType.STRIPE_PAYMENT_SUCCEEDED,
        );
      } else if (status === 'uncollectible' || status === 'void') {
        await this.triggerAutomation(
          userId,
          connectionId,
          AlertTriggerType.STRIPE_PAYMENT_FAILED,
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

  private resolveSubscriptionEvent(
    existing: { status: string; currentPeriodEnd: Date | null } | null,
    status: string,
    currentPeriodEnd: Date | null,
  ): AlertTriggerType | null {
    if (!existing && status === 'canceled')
      return AlertTriggerType.STRIPE_SUBSCRIPTION_CANCELED;
    if (existing?.status !== status) {
      if (status === 'canceled')
        return AlertTriggerType.STRIPE_SUBSCRIPTION_CANCELED;
      if (status === 'unpaid' || status === 'incomplete_expired') {
        return AlertTriggerType.STRIPE_SUBSCRIPTION_EXPIRED;
      }
    }
    if (
      existing?.currentPeriodEnd &&
      currentPeriodEnd &&
      currentPeriodEnd > existing.currentPeriodEnd &&
      (status === 'active' || status === 'trialing')
    ) {
      return AlertTriggerType.STRIPE_SUBSCRIPTION_RENEWED;
    }
    return this.isExpiringSoon(status, currentPeriodEnd)
      ? AlertTriggerType.STRIPE_SUBSCRIPTION_EXPIRING
      : null;
  }

  private async recordSubscriptionEvent(
    userId: string,
    connectionId: string,
    triggerType: AlertTriggerType,
    stripeSubscriptionId: string,
  ) {
    const actionByTrigger: Partial<
      Record<AlertTriggerType, StripeBillingAuditAction>
    > = {
      STRIPE_SUBSCRIPTION_EXPIRING: 'SUBSCRIPTION_EXPIRING',
      STRIPE_SUBSCRIPTION_EXPIRED: 'SUBSCRIPTION_EXPIRED',
      STRIPE_SUBSCRIPTION_CANCELED: 'SUBSCRIPTION_CANCELED',
      STRIPE_SUBSCRIPTION_RENEWED: 'SUBSCRIPTION_RENEWED',
    };
    const action = actionByTrigger[triggerType];
    if (action)
      await this.recordAudit(userId, connectionId, action, {
        stripeSubscriptionId,
      });
    await this.triggerAutomation(userId, connectionId, triggerType);
  }

  private async triggerAutomation(
    userId: string,
    connectionId: string,
    triggerType: AlertTriggerType,
  ) {
    const result = await this.alerts.triggerAutomationAlertsForUser(
      userId,
      triggerType,
      connectionId,
    );
    if (result.triggeredCount === 0) return;

    await this.prisma.stripeBillingAuditLogs.create({
      data: {
        userId,
        action: 'AUTOMATION_TRIGGERED',
        metadata: { triggerType, triggeredCount: result.triggeredCount },
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

  private isExpiringSoon(status: string, currentPeriodEnd: Date | null) {
    if (!currentPeriodEnd || (status !== 'active' && status !== 'trialing'))
      return false;
    const now = Date.now();
    const end = currentPeriodEnd.getTime();
    return end >= now && end <= now + EXPIRING_WINDOW_DAYS * 86_400_000;
  }
}
