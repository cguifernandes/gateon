import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
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
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import {
  StripeBillingConnectInput,
  StripeBillingPreviewCatalogInput,
  StripeBillingUpdateLinkedGroupInput,
} from './schemas/stripe-billing-schemas';
import {
  getStripeCustomerId,
  getStripeSubscriptionId,
  StripeBillingStripeClient,
  type StripeCheckoutSessionRecord,
} from './stripe-billing-stripe-client';
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

  constructor(
    private readonly prisma: PrismaService,
    private readonly sync: StripeBillingSyncService,
    private readonly config: ConfigService,
    private readonly telegram: TelegramService,
    private readonly groupLimit: GroupLimitService,
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
    await this.assertOwnedGroup(userId, input.telegramGroupId);
    await this.assertCanLinkGroup(userId, input.telegramGroupId);

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

    return this.getStatus(userId);
  }

  async updateLinkedGroup(
    userId: string,
    connectionId: string,
    input: StripeBillingUpdateLinkedGroupInput,
  ) {
    await this.getOwnedConnection(userId, connectionId);
    await this.assertOwnedGroup(userId, input.telegramGroupId);
    await this.assertCanLinkGroup(userId, input.telegramGroupId, connectionId);

    await this.prisma.stripeBillingConnections.update({
      where: { id: connectionId },
      data: { telegramGroupId: input.telegramGroupId },
    });

    return this.getStatus(userId);
  }

  async syncNow(userId: string, connectionId: string) {
    await this.getOwnedConnection(userId, connectionId);
    await this.sync.syncConnection(userId, connectionId);
    await this.reconcilePendingSessions(connectionId);
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

    return this.getStatus(userId);
  }

  async createCheckoutButtonsForStart(input: {
    publicStartToken: string;
    telegramUserId: string;
    telegramGroupId?: string;
  }): Promise<CheckoutButtonResult[]> {
    const settings = await this.prisma.telegramBotStartSettings.findUnique({
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
    const settings = await this.prisma.telegramBotStartSettings.findUnique({
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

  async finalizeCheckoutSession(sessionId: string): Promise<void> {
    const pending = await this.prisma.stripeTelegramCheckoutSessions.findUnique(
      {
        where: { stripeCheckoutSessionId: sessionId },
      },
    );

    if (!pending) {
      throw new NotFoundException('Sessão de checkout não encontrada.');
    }

    if (pending.status === StripeTelegramCheckoutStatus.COMPLETED) {
      return;
    }

    const client = await this.getClientForConnection(pending.connectionId);
    const session = await client.retrieveCheckoutSession(sessionId);

    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      throw new BadRequestException('O pagamento ainda não foi concluído.');
    }

    await this.completeCheckoutRecord(pending.id, session);
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
    const webBaseUrl = this.getWebBaseUrl();

    const session = await client.createCheckoutSession({
      priceId: input.stripePriceId,
      successUrl: `${webBaseUrl}/stripe/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${webBaseUrl}/stripe/checkout/cancel`,
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
      name: 'Gateon — acesso após pagamento',
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

  private async buildStatusPayload(userId: string) {
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
        this.mapConnectionForResponse(connection),
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
  ) {
    const { group, ...rest } = connection;
    return {
      ...rest,
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
