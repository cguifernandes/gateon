import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StripeBillingConnectionStatus } from '@prisma/client';
import { encryptSecretValue } from '../../utils/utils';
import { PrismaService } from '../prisma/prisma.service';
import {
  StripeBillingConnectInput,
  StripeBillingPreviewCatalogInput,
} from './schemas/stripe-billing-schemas';
import { StripeBillingStripeClient } from './stripe-billing-stripe-client';
import { StripeBillingSyncService } from './stripe-billing-sync.service';

const connectionSelect = {
  id: true,
  stripeAccountId: true,
  apiKeyLast4: true,
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
  updatedAt: true,
} as const;

type ConnectionRow = Prisma.StripeBillingConnectionsGetPayload<{
  select: typeof connectionSelect;
}>;

@Injectable()
export class StripeBillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sync: StripeBillingSyncService,
  ) {}

  async getStatus(userId: string) {
    return this.buildStatusPayload(userId);
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

  async connect(userId: string, input: StripeBillingConnectInput) {
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

    const consentAcceptedAt = new Date();
    const connectionData = {
      stripeAccountId: account.id,
      encryptedApiKey: encryptSecretValue(apiKey),
      apiKeyLast4: apiKey.slice(-4),
      status: StripeBillingConnectionStatus.CONNECTED,
      consentAcceptedAt,
      disconnectedAt: null,
      monitoredStripePriceId: mappedPrice.id,
      monitoredStripeProductId: mappedPrice.productId,
      monitoredPlanLabel: mappedPrice.label,
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

    return this.getStatus(userId);
  }

  async syncNow(userId: string, connectionId: string) {
    await this.getOwnedConnection(userId, connectionId);
    await this.sync.syncConnection(userId, connectionId);
    return this.getStatus(userId);
  }

  async disconnect(userId: string, connectionId: string) {
    const connection = await this.getOwnedConnection(userId, connectionId);

    if (connection.status !== StripeBillingConnectionStatus.CONNECTED) {
      return this.getStatus(userId);
    }

    await this.prisma.$transaction([
      this.prisma.stripeBillingConnections.update({
        where: { id: connection.id },
        data: {
          status: StripeBillingConnectionStatus.DISCONNECTED,
          encryptedApiKey: encryptSecretValue('disconnected'),
          disconnectedAt: new Date(),
          monitoredStripePriceId: null,
          monitoredStripeProductId: null,
          monitoredPlanLabel: null,
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

    return this.getStatus(userId);
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

  private async buildStatusPayload(userId: string) {
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

    return {
      connected: connectionsWithCounts.length > 0,
      canConnect: true,
      connections: connectionsWithCounts,
      totals: this.aggregateTotals(connectionsWithCounts),
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
