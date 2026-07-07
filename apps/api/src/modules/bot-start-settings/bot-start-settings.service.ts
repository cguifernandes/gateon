import { randomBytes, timingSafeEqual } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AlertTriggerType,
  Prisma,
  StripeBillingConnectionStatus,
} from '@prisma/client';
import { GroupLimitService } from '../group-limits/group-limits.service';
import {
  hasPlanFeature,
  buildPlanFeatureRequiredMessage,
} from '../../lib/plan/plan-features';
import { PLAN_LABELS } from '../../lib/plan/plan-limits';
import { resolveStripeLinkedTelegramSubscriber } from '../../lib/stripe/telegram-subscriber';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import {
  PUBLIC_START_TOKEN_PREFIX,
  type TelegramBotStartPublicResponseDto,
  type TelegramBotStartSettingsPatchInput,
  type TelegramBotStartSettingsResponseDto,
} from '../../lib/zod/bot-start-settings-schemas';

export const PAID_PLAN_REQUIRED_CODE = 'PAID_PLAN_REQUIRED';

const DEFAULT_WELCOME_MESSAGE =
  'Olá! Bem-vindo(a). Este é o assistente configurado pelo criador do grupo.';

const DEFAULT_SUPPORT_HINT =
  'Dúvidas? Fale com o administrador do grupo ou responda neste chat.';

const AUTO_REMOVE_TRIGGER_TYPES = new Set<AlertTriggerType>([
  AlertTriggerType.STRIPE_SUBSCRIPTION_EXPIRED,
  AlertTriggerType.STRIPE_SUBSCRIPTION_CANCELED,
]);

type TelegramUserSettingsRow = {
  publicStartToken: string;
  welcomeMessageEnabled: boolean;
  welcomeMessage: string | null;
  showStripePlans: boolean;
  stripeConnectionIds: string[];
  showPaymentButtons: boolean;
  paymentButtonConnectionIds: string[];
  paymentButtonsGroupFirst: boolean;
  showSupportHint: boolean;
  supportHintText: string | null;
  showSubscribeSteps: boolean;
  autoRemoveExpiredSubscribers: boolean;
};

@Injectable()
export class BotStartSettingsService {
  private readonly logger = new Logger(BotStartSettingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly groupLimit: GroupLimitService,
    private readonly telegram: TelegramService,
  ) {}

  isInternalSecretValid(candidate: string | undefined): boolean {
    const expected = this.config
      .get<string>('TELEGRAM_BOT_INTERNAL_SECRET')
      ?.trim();
    if (!candidate || !expected) {
      return false;
    }

    const expectedBuffer = Buffer.from(expected);
    const candidateBuffer = Buffer.from(candidate.trim());
    return (
      expectedBuffer.length === candidateBuffer.length &&
      timingSafeEqual(expectedBuffer, candidateBuffer)
    );
  }

  async getForUser(
    userId: string,
  ): Promise<TelegramBotStartSettingsResponseDto> {
    const settings = await this.ensureForUser(userId);
    const availableStripeConnections = await this.listStripeConnections(userId);

    return this.toResponse(userId, settings, availableStripeConnections);
  }

  async updateForUser(
    userId: string,
    input: TelegramBotStartSettingsPatchInput,
  ): Promise<TelegramBotStartSettingsResponseDto> {
    if (input.stripeConnectionIds) {
      await this.assertOwnedStripeConnections(
        userId,
        input.stripeConnectionIds,
      );
    }

    const current = await this.ensureForUser(userId);
    const planId = await this.groupLimit.resolvePlanId(userId);
    const nextPaymentButtonConnectionIds =
      input.paymentButtonConnectionIds ?? current.paymentButtonConnectionIds;
    const nextShowPaymentButtons =
      input.showPaymentButtons ?? current.showPaymentButtons;
    const nextShowStripePlans =
      input.showStripePlans ?? current.showStripePlans;
    const nextAutoRemove =
      input.autoRemoveExpiredSubscribers ??
      current.autoRemoveExpiredSubscribers;

    if (nextShowPaymentButtons && !hasPlanFeature(planId, 'botCheckout')) {
      throw new ForbiddenException({
        error: PAID_PLAN_REQUIRED_CODE,
        feature: 'botCheckout',
        planId,
        message: buildPlanFeatureRequiredMessage('botCheckout', planId),
      });
    }

    if (nextShowStripePlans && !hasPlanFeature(planId, 'botCheckout')) {
      throw new ForbiddenException({
        error: PAID_PLAN_REQUIRED_CODE,
        feature: 'botCheckout',
        planId,
        message: buildPlanFeatureRequiredMessage('botCheckout', planId),
      });
    }

    if (
      nextAutoRemove &&
      !hasPlanFeature(planId, 'autoRemoveExpiredSubscribers')
    ) {
      throw new ForbiddenException({
        error: PAID_PLAN_REQUIRED_CODE,
        feature: 'autoRemoveExpiredSubscribers',
        planId,
        message: buildPlanFeatureRequiredMessage(
          'autoRemoveExpiredSubscribers',
          planId,
        ),
      });
    }

    if (input.paymentButtonConnectionIds) {
      await this.assertOwnedStripeConnections(
        userId,
        input.paymentButtonConnectionIds,
      );
    }

    if (nextShowPaymentButtons) {
      await this.assertPaymentConnectionsReadyForCheckout(
        userId,
        nextPaymentButtonConnectionIds,
      );
    }

    const updated = await this.prisma.telegramUserSettings.update({
      where: { userId },
      data: {
        welcomeMessageEnabled:
          input.welcomeMessageEnabled ?? current.welcomeMessageEnabled,
        welcomeMessage:
          input.welcomeMessage !== undefined
            ? input.welcomeMessage.trim() || null
            : current.welcomeMessage,
        showStripePlans: input.showStripePlans ?? current.showStripePlans,
        stripeConnectionIds:
          input.stripeConnectionIds ?? current.stripeConnectionIds,
        showPaymentButtons: nextShowPaymentButtons,
        paymentButtonConnectionIds: nextPaymentButtonConnectionIds,
        paymentButtonsGroupFirst:
          input.paymentButtonsGroupFirst ?? current.paymentButtonsGroupFirst,
        showSupportHint: input.showSupportHint ?? current.showSupportHint,
        supportHintText:
          input.supportHintText !== undefined
            ? input.supportHintText.trim() || null
            : current.supportHintText,
        showSubscribeSteps:
          input.showSubscribeSteps ?? current.showSubscribeSteps,
        autoRemoveExpiredSubscribers:
          input.autoRemoveExpiredSubscribers ??
          current.autoRemoveExpiredSubscribers,
      },
      select: this.settingsSelect(),
    });

    const availableStripeConnections = await this.listStripeConnections(userId);
    return this.toResponse(userId, updated, availableStripeConnections);
  }

  async tryAutoRemoveExpiredSubscriber(input: {
    userId: string;
    connectionId: string;
    triggerType: AlertTriggerType;
    stripeSubscriptionId: string;
    stripeCustomerId?: string | null;
  }): Promise<void> {
    if (!AUTO_REMOVE_TRIGGER_TYPES.has(input.triggerType)) {
      return;
    }

    const settings = await this.ensureForUser(input.userId);
    if (!settings.autoRemoveExpiredSubscribers) {
      return;
    }

    const subscription = await this.prisma.stripeBillingSubscriptions.findFirst(
      {
        where: {
          connectionId: input.connectionId,
          stripeSubscriptionId: input.stripeSubscriptionId,
        },
        select: { status: true, cancelAtPeriodEnd: true, canceledAt: true },
      },
    );

    if (
      input.triggerType === AlertTriggerType.STRIPE_SUBSCRIPTION_CANCELED &&
      subscription &&
      (subscription.status === 'active' || subscription.status === 'trialing') &&
      !subscription.canceledAt
    ) {
      return;
    }

    const subscriber = await resolveStripeLinkedTelegramSubscriber(
      this.prisma,
      {
        connectionId: input.connectionId,
        stripeCustomerId: input.stripeCustomerId,
        stripeSubscriptionId: input.stripeSubscriptionId,
      },
    );

    if (!subscriber) {
      return;
    }

    const group = await this.prisma.telegramGroups.findFirst({
      where: {
        id: subscriber.telegramGroupId,
        userId: input.userId,
      },
      select: { id: true, title: true },
    });

    if (!group) {
      return;
    }

    try {
      this.logger.log(
        `[auto-remove] Removing telegram user ${subscriber.telegramUserId} from group ${group.id} (${group.title ?? 'sem título'}) — trigger=${input.triggerType}, subscription=${input.stripeSubscriptionId}, connection=${input.connectionId}`,
      );

      const result = await this.telegram.performGroupMemberActions(
        input.userId,
        group.id,
        {
          action: 'remove',
          telegramUserIds: [subscriber.telegramUserId],
        },
      );

      if (result.successCount > 0) {
        this.logger.log(
          `[auto-remove] Removed telegram user ${subscriber.telegramUserId} from group ${group.id} (${group.title ?? 'sem título'})`,
        );
      }

      if (result.failedCount > 0) {
        this.logger.warn(
          `Auto-remove failed for user ${input.userId} in group ${group.id}: ${result.failures[0]?.reason ?? 'unknown'}`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Auto-remove threw for user ${input.userId}: ${
          error instanceof Error ? error.message : 'unknown'
        }`,
      );
    }
  }

  async getPublicByToken(
    token: string,
  ): Promise<TelegramBotStartPublicResponseDto> {
    const settings = await this.prisma.telegramUserSettings.findUnique({
      where: { publicStartToken: token.trim() },
      select: {
        userId: true,
        ...this.settingsSelect(),
      },
    });

    if (!settings) {
      throw new NotFoundException('Link de /start inválido ou expirado.');
    }

    const stripePlans = settings.showStripePlans
      ? await this.resolveVisibleStripePlans(
          settings.userId,
          settings.stripeConnectionIds,
        )
      : [];

    return {
      welcomeMessageEnabled: settings.welcomeMessageEnabled,
      welcomeMessage: settings.welcomeMessage,
      showStripePlans: settings.showStripePlans,
      showPaymentButtons: settings.showPaymentButtons,
      paymentButtonsGroupFirst: settings.paymentButtonsGroupFirst,
      showSupportHint: settings.showSupportHint,
      supportHintText: settings.supportHintText,
      showSubscribeSteps: settings.showSubscribeSteps,
      stripePlans: stripePlans.map((connection) => ({
        connectionId: connection.id,
        label:
          connection.monitoredPlanLabel?.trim() ||
          connection.monitoredStripePriceId ||
          'Plano Stripe',
        monitoredStripePriceId: connection.monitoredStripePriceId,
      })),
    };
  }

  private async ensureForUser(
    userId: string,
  ): Promise<TelegramUserSettingsRow> {
    const existing = await this.prisma.telegramUserSettings.findUnique({
      where: { userId },
      select: this.settingsSelect(),
    });

    if (existing) {
      return existing;
    }

    return this.prisma.telegramUserSettings.create({
      data: {
        userId,
        publicStartToken: this.generatePublicStartToken(),
        welcomeMessage: DEFAULT_WELCOME_MESSAGE,
        ...this.defaultSettings(),
      },
      select: this.settingsSelect(),
    });
  }

  private async listStripeConnections(userId: string) {
    return this.prisma.stripeBillingConnections.findMany({
      where: {
        userId,
        status: StripeBillingConnectionStatus.CONNECTED,
        monitoredStripePriceId: { not: null },
      },
      select: {
        id: true,
        monitoredPlanLabel: true,
        monitoredStripePriceId: true,
        apiKeyLast4: true,
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
  }

  private async resolveVisibleStripePlans(
    userId: string,
    selectedConnectionIds: string[],
  ) {
    const connections = await this.listStripeConnections(userId);
    if (selectedConnectionIds.length === 0) {
      return connections;
    }

    const selected = new Set(selectedConnectionIds);
    return connections.filter((connection) => selected.has(connection.id));
  }

  private async assertOwnedStripeConnections(
    userId: string,
    connectionIds: string[],
  ) {
    if (connectionIds.length === 0) return;

    const count = await this.prisma.stripeBillingConnections.count({
      where: {
        userId,
        id: { in: connectionIds },
        status: StripeBillingConnectionStatus.CONNECTED,
      },
    });

    if (count !== connectionIds.length) {
      throw new BadRequestException(
        'Uma ou mais integrações Stripe selecionadas são inválidas.',
      );
    }
  }

  private async assertPaymentConnectionsReadyForCheckout(
    userId: string,
    paymentButtonConnectionIds: string[],
  ) {
    const allConnections = await this.listStripeConnections(userId);
    const targetConnections =
      paymentButtonConnectionIds.length === 0
        ? allConnections
        : allConnections.filter((connection) =>
            paymentButtonConnectionIds.includes(connection.id),
          );

    if (targetConnections.length === 0) {
      throw new BadRequestException(
        'Conecte um plano Stripe em Integrações para habilitar os botões de pagamento.',
      );
    }

    for (const connection of targetConnections) {
      if (!connection.telegramGroupId) {
        const label =
          connection.monitoredPlanLabel?.trim() ||
          connection.monitoredStripePriceId ||
          'Plano Stripe';
        throw new BadRequestException(
          `Vincule um grupo ao plano "${label}" em Integrações antes de ativar os botões de pagamento.`,
        );
      }
    }
  }

  private async toResponse(
    userId: string,
    settings: TelegramUserSettingsRow,
    availableStripeConnections: {
      id: string;
      monitoredPlanLabel: string | null;
      monitoredStripePriceId: string | null;
      apiKeyLast4: string;
      telegramGroupId: string | null;
      group: { id: string; title: string | null } | null;
    }[],
  ): Promise<TelegramBotStartSettingsResponseDto> {
    const botUsername = this.getBotUsername();
    const planId = await this.groupLimit.resolvePlanId(userId);
    const canUsePaidAutomation = hasPlanFeature(
      planId,
      'autoRemoveExpiredSubscribers',
    );
    const canUseBotCheckout = hasPlanFeature(planId, 'botCheckout');

    return {
      welcomeMessageEnabled: settings.welcomeMessageEnabled,
      welcomeMessage: settings.welcomeMessage ?? '',
      showStripePlans: canUseBotCheckout ? settings.showStripePlans : false,
      stripeConnectionIds: canUseBotCheckout
        ? settings.stripeConnectionIds
        : [],
      showPaymentButtons: canUseBotCheckout
        ? settings.showPaymentButtons
        : false,
      paymentButtonConnectionIds: canUseBotCheckout
        ? settings.paymentButtonConnectionIds
        : [],
      paymentButtonsGroupFirst: settings.paymentButtonsGroupFirst,
      showSupportHint: settings.showSupportHint,
      supportHintText: settings.supportHintText ?? '',
      showSubscribeSteps: settings.showSubscribeSteps,
      autoRemoveExpiredSubscribers: canUsePaidAutomation
        ? settings.autoRemoveExpiredSubscribers
        : false,
      canUsePaidAutomation,
      canUseBotCheckout,
      planId,
      planLabel: PLAN_LABELS[planId],
      publicStartToken: settings.publicStartToken,
      publicStartUrl: `https://t.me/${botUsername}?start=${encodeURIComponent(settings.publicStartToken)}`,
      botUsername,
      availableStripeConnections: availableStripeConnections.map(
        (connection) => ({
          id: connection.id,
          label:
            connection.monitoredPlanLabel?.trim() ||
            connection.monitoredStripePriceId ||
            'Plano Stripe',
          monitoredStripePriceId: connection.monitoredStripePriceId,
          apiKeyLast4: connection.apiKeyLast4,
          linkedGroup: connection.group
            ? {
                id: connection.group.id,
                title: connection.group.title?.trim() || 'Grupo sem nome',
              }
            : null,
        }),
      ),
    };
  }

  private generatePublicStartToken(): string {
    return `${PUBLIC_START_TOKEN_PREFIX}${randomBytes(18).toString('base64url')}`;
  }

  private getBotUsername(): string {
    const raw = this.config.get<string>('TELEGRAM_BOT_USERNAME') ?? 'GateonBot';
    return raw.replace(/^@/, '').trim();
  }

  private defaultSettings(): Omit<
    Prisma.TelegramUserSettingsUncheckedCreateInput,
    'userId' | 'publicStartToken' | 'welcomeMessage'
  > {
    return {
      welcomeMessageEnabled: true,
      showStripePlans: false,
      stripeConnectionIds: [],
      showPaymentButtons: false,
      paymentButtonConnectionIds: [],
      paymentButtonsGroupFirst: false,
      showSupportHint: true,
      supportHintText: null,
      showSubscribeSteps: true,
      autoRemoveExpiredSubscribers: false,
    };
  }

  private settingsSelect() {
    return {
      publicStartToken: true,
      welcomeMessageEnabled: true,
      welcomeMessage: true,
      showStripePlans: true,
      stripeConnectionIds: true,
      showPaymentButtons: true,
      paymentButtonConnectionIds: true,
      paymentButtonsGroupFirst: true,
      showSupportHint: true,
      supportHintText: true,
      showSubscribeSteps: true,
      autoRemoveExpiredSubscribers: true,
    } as const;
  }

  static readonly defaultSupportHint = DEFAULT_SUPPORT_HINT;
}
