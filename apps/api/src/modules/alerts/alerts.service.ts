import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  AlertDeliveryStatus,
  AlertDestinationType,
  AlertRunStatus,
  AlertStatus,
  AlertTriggerType,
  Prisma,
  StripeBillingConnectionStatus,
  TelegramAlertRuns,
  TelegramAlerts,
  TelegramGroups,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GroupLimitService } from '../group-limits/group-limits.service';
import { TelegramService } from '../telegram/telegram.service';
import {
  ALERT_DELIVERY_NO_TARGETS_MESSAGE,
  getAlertGroupDeliveryBlockReason,
} from '../../lib/alerts/delivery-messages';
import { buildDateParamRange } from '../../lib/query/date-param-range';
import {
  filterStripeAutomationAlerts,
  isStripeAutomationTriggerType,
} from '../../lib/stripe/automation-alerts';
import {
  getMaxAlertTemplatesForPlan,
  getMinPlanForFeature,
  isAlertTriggerAllowedForPlan,
  PLAN_FEATURE_REQUIRED_CODE,
  buildPlanFeatureRequiredMessage,
  type PlanFeatureId,
} from '../../lib/plan/plan-features';
import {
  alertInternalTriggerSchema,
  type AlertContentInput,
  type AlertInternalTriggerInput,
  type AlertListQueryInput,
  type AlertOptionsInput,
  type AlertQuickDispatchInput,
  type AlertTemplateCreateInput,
  type AlertUpsertInput,
  toAlertTriggerTypeInput,
} from '../../lib/zod/alert-schemas';
import {
  buildPaginationMeta,
  resolvePagination,
} from '../../lib/query/pagination';
import pLimit from 'p-limit';

const DEFAULT_RATE_LIMIT_PER_MINUTE = 20;

type DeliveryTarget =
  | { kind: 'chat'; chatId: string; threadId?: number | null }
  | { kind: 'member'; telegramUserId: string; displayName?: string };

type RunAlertOptions = {
  /** When set (event-triggered automation), deliver only to this Telegram chat. */
  scopeToTelegramChatId?: string;
  scopeToMessageThreadId?: number;
  scopeToTelegramUserId?: string;
  scopeToMemberDisplayName?: string;
  quickDispatchMembers?: { telegramUserId: string; displayName?: string }[];
  /** When true (default), user-initiated runs throw if nothing was delivered. */
  throwOnTotalFailure?: boolean;
};

type AlertWithRelations = TelegramAlerts & {
  group: Pick<TelegramGroups, 'botStatus'> | null;
};

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramService,
    private readonly groupLimit: GroupLimitService,
  ) {}

  async listAlerts(userId: string, query: AlertListQueryInput) {
    const createdRange = buildDateParamRange(
      query.createdFrom,
      query.createdTo,
    );
    const { skip, take, page, pageSize } = resolvePagination({
      page: query.page,
      pageSize: query.pageSize,
      all: query.all,
    });

    const where: Prisma.TelegramAlertsWhereInput = {
      userId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.destinationType
        ? { destinationType: query.destinationType }
        : {}),
      ...(query.groupId ? { telegramGroupId: query.groupId } : {}),
      ...(createdRange ? { createdAt: createdRange } : {}),
      ...(query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' } },
              { internalTitle: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [alerts, totalItems, activeCount, sentToday, runsToday, draftCount] =
      await Promise.all([
        this.prisma.telegramAlerts.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: query.all ? undefined : skip,
          take: query.all ? undefined : take,
          include: {
            group: { select: { id: true, title: true, botStatus: true } },
            targets: { select: { telegramUserId: true } },
            runs: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: {
                id: true,
                status: true,
                successCount: true,
                failCount: true,
                startedAt: true,
                finishedAt: true,
              },
            },
          },
        }),
        this.prisma.telegramAlerts.count({ where }),
        this.prisma.telegramAlerts.count({
          where: {
            userId,
            status: AlertStatus.ACTIVE,
            destinationType: AlertDestinationType.AUTOMATION,
          },
        }),
        this.prisma.telegramAlertDeliveries.count({
          where: {
            status: 'SENT',
            createdAt: { gte: startOfDay },
            run: { alert: { userId } },
          },
        }),
        this.prisma.telegramAlertRuns.aggregate({
          where: {
            createdAt: { gte: startOfDay },
            alert: { userId },
          },
          _sum: { successCount: true, failCount: true },
        }),
        this.prisma.telegramAlerts.count({
          where: { userId, status: AlertStatus.DRAFT },
        }),
      ]);

    const success = runsToday._sum.successCount ?? 0;
    const failed = runsToday._sum.failCount ?? 0;
    const deliveryRate =
      success + failed === 0
        ? 0
        : Math.round((success / (success + failed)) * 100);

    return {
      alerts: alerts.map((alert) => ({
        ...alert,
        recipientCount: this.getStoredRecipientCount(alert),
        lastRun: alert.runs[0] ?? null,
      })),
      stats: {
        activeCount,
        sentToday,
        deliveryRate,
        draftCount,
      },
      pagination: buildPaginationMeta(page, pageSize, totalItems, query.all),
    };
  }

  async getAlert(userId: string, alertId: string) {
    const alert = await this.prisma.telegramAlerts.findFirst({
      where: { id: alertId, userId },
      include: {
        group: { select: { id: true, title: true, botStatus: true } },
        targets: { select: { telegramUserId: true } },
      },
    });

    if (!alert) {
      throw new NotFoundException('Alert not found.');
    }

    return {
      ...alert,
      recipientCount: this.getStoredRecipientCount(alert),
    };
  }

  async createAlert(userId: string, input: AlertUpsertInput) {
    const normalizedInput = this.normalizeStripeAutomationInput(
      this.normalizeQuickAlertInput(this.normalizeTopicSelection(input)),
    );
    await this.assertAlertTriggerAllowed(userId, normalizedInput.triggerType);
    await this.assertGroupsAccess(
      userId,
      this.getAlertGroupIds(normalizedInput),
    );
    await this.assertStripeConnectionForTrigger(
      userId,
      normalizedInput.triggerType,
      normalizedInput.triggerConfig,
    );

    const status = this.resolveInitialStatus(input);
    const options = this.normalizeOptions(input.options);

    const alert = await this.prisma.telegramAlerts.create({
      data: {
        userId,
        createdByUserId: userId,
        name: normalizedInput.name,
        internalTitle: normalizedInput.internalTitle,
        status,
        destinationType: normalizedInput.destinationType,
        telegramGroupId: normalizedInput.telegramGroupId,
        messageThreadId: normalizedInput.messageThreadId,
        content: normalizedInput.content as Prisma.InputJsonValue,
        options: options as Prisma.InputJsonValue,
        triggerType: normalizedInput.triggerType,
        triggerConfig: normalizedInput.triggerConfig as
          | Prisma.InputJsonValue
          | undefined,
        targets: {
          createMany: {
            data:
              normalizedInput.destinationType === AlertDestinationType.MEMBERS
                ? (normalizedInput.targetTelegramUserIds ?? []).map(
                    (telegramUserId) => ({
                      telegramUserId,
                    }),
                  )
                : [],
            skipDuplicates: true,
          },
        },
      },
    });

    if (
      status === AlertStatus.ACTIVE &&
      input.destinationType !== AlertDestinationType.AUTOMATION &&
      input.destinationType !== AlertDestinationType.QUICK_ALERT
    ) {
      await this.runAlert(alert.id);
    }

    return this.getAlert(userId, alert.id);
  }

  async updateAlert(userId: string, alertId: string, input: AlertUpsertInput) {
    await this.assertAlertAccess(userId, alertId);
    const normalizedInput = this.normalizeStripeAutomationInput(
      this.normalizeQuickAlertInput(this.normalizeTopicSelection(input)),
    );
    await this.assertAlertTriggerAllowed(userId, normalizedInput.triggerType);
    await this.assertGroupsAccess(
      userId,
      this.getAlertGroupIds(normalizedInput),
    );
    await this.assertStripeConnectionForTrigger(
      userId,
      normalizedInput.triggerType,
      normalizedInput.triggerConfig,
    );

    const options = this.normalizeOptions(input.options);
    const status = input.status ?? undefined;

    await this.prisma.$transaction([
      this.prisma.telegramAlertTargets.deleteMany({ where: { alertId } }),
      this.prisma.telegramAlerts.update({
        where: { id: alertId },
        data: {
          name: normalizedInput.name,
          internalTitle: normalizedInput.internalTitle,
          ...(status ? { status } : {}),
          destinationType: normalizedInput.destinationType,
          telegramGroupId: normalizedInput.telegramGroupId,
          messageThreadId: normalizedInput.messageThreadId,
          content: normalizedInput.content as Prisma.InputJsonValue,
          options: options as Prisma.InputJsonValue,
          triggerType: normalizedInput.triggerType,
          triggerConfig: normalizedInput.triggerConfig as
            | Prisma.InputJsonValue
            | undefined,
        },
      }),
      ...(normalizedInput.destinationType === AlertDestinationType.MEMBERS &&
      normalizedInput.targetTelegramUserIds?.length
        ? [
            this.prisma.telegramAlertTargets.createMany({
              data: normalizedInput.targetTelegramUserIds.map(
                (telegramUserId) => ({
                  alertId,
                  telegramUserId,
                }),
              ),
              skipDuplicates: true,
            }),
          ]
        : []),
    ]);

    return this.getAlert(userId, alertId);
  }

  async duplicateAlert(userId: string, alertId: string) {
    const alert = await this.getAlert(userId, alertId);
    return this.createAlert(userId, {
      name: `${alert.name} (cópia)`,
      internalTitle: alert.internalTitle ?? undefined,
      status: AlertStatus.DRAFT,
      destinationType: alert.destinationType,
      telegramGroupId: alert.telegramGroupId ?? undefined,
      messageThreadId: alert.messageThreadId ?? undefined,
      content: alert.content as AlertContentInput,
      options: alert.options as AlertOptionsInput,
      triggerType: toAlertTriggerTypeInput(alert.triggerType),
      triggerConfig:
        (alert.triggerConfig as AlertUpsertInput['triggerConfig']) ?? undefined,
      targetTelegramUserIds: alert.targets.map(
        (target) => target.telegramUserId,
      ),
    });
  }

  async pauseAlert(userId: string, alertId: string) {
    await this.assertAlertAccess(userId, alertId);
    return this.prisma.telegramAlerts.update({
      where: { id: alertId },
      data: { status: AlertStatus.PAUSED },
    });
  }

  async activateAlert(userId: string, alertId: string) {
    const alert = await this.getAlert(userId, alertId);

    await this.prisma.telegramAlerts.update({
      where: { id: alertId },
      data: { status: AlertStatus.ACTIVE },
    });

    if (
      alert.destinationType !== AlertDestinationType.AUTOMATION &&
      alert.destinationType !== AlertDestinationType.QUICK_ALERT
    ) {
      await this.runAlert(alertId);
    }

    return this.getAlert(userId, alertId);
  }

  async deleteAlert(userId: string, alertId: string) {
    await this.assertAlertAccess(userId, alertId);
    await this.prisma.telegramAlerts.delete({ where: { id: alertId } });
    return { deleted: true as const };
  }

  async listRuns(userId: string, alertId: string) {
    await this.assertAlertAccess(userId, alertId);
    return this.prisma.telegramAlertRuns.findMany({
      where: { alertId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async listDeliveries(userId: string, alertId: string, runId: string) {
    await this.assertAlertAccess(userId, alertId);
    return this.prisma.telegramAlertDeliveries.findMany({
      where: { runId, run: { alertId } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async listTemplates(userId: string) {
    return this.prisma.telegramAlertTemplates.findMany({
      where: { userId },
      orderBy: [{ category: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async createTemplate(userId: string, input: AlertTemplateCreateInput) {
    const planId = await this.groupLimit.resolvePlanId(userId);
    const maxTemplates = getMaxAlertTemplatesForPlan(planId);
    if (maxTemplates !== null) {
      const count = await this.prisma.telegramAlertTemplates.count({
        where: { userId },
      });
      if (count >= maxTemplates) {
        throw new ForbiddenException({
          error: PLAN_FEATURE_REQUIRED_CODE,
          feature: 'advancedTelegramAlerts',
          planId,
          message: `O plano gratuito permite até ${maxTemplates} modelos de alerta. Faça upgrade para criar mais.`,
        });
      }
    }

    return this.prisma.telegramAlertTemplates.create({
      data: {
        userId,
        name: input.name,
        category: input.category,
        content: input.content,
      },
    });
  }

  async handleInternalTrigger(body: unknown) {
    const input = alertInternalTriggerSchema.parse(body);
    return this.triggerAlertsForEvent(input);
  }

  async triggerAutomationAlertsForUser(
    userId: string,
    triggerType: AlertInternalTriggerInput['triggerType'],
    stripeConnectionId: string,
    subscriber?: { telegramUserId: string; displayName?: string },
  ) {
    const automationAlerts = await this.prisma.telegramAlerts.findMany({
      where: {
        userId,
        status: AlertStatus.ACTIVE,
        destinationType: AlertDestinationType.AUTOMATION,
        triggerType,
      },
      select: { id: true, triggerConfig: true },
      take: 100,
    });

    const matchingAlerts = filterStripeAutomationAlerts(
      automationAlerts,
      stripeConnectionId,
    );

    this.logger.log(
      `[alert-dispatch] triggerAutomationAlertsForUser userId=${userId} triggerType=${triggerType} connectionId=${stripeConnectionId} activeAlerts=${automationAlerts.length} matchingAlerts=${matchingAlerts.length} subscriber=${subscriber?.telegramUserId ?? 'none'}`,
    );

    const runOptions: RunAlertOptions = {
      throwOnTotalFailure: false,
      ...(subscriber
        ? {
            scopeToTelegramUserId: subscriber.telegramUserId,
            scopeToMemberDisplayName: subscriber.displayName,
          }
        : {}),
    };

    for (const alert of matchingAlerts) {
      this.logger.log(
        `[alert-dispatch] running alert id=${alert.id} triggerConfig=${JSON.stringify(alert.triggerConfig)}`,
      );
      await this.runAlert(alert.id, runOptions);
    }

    return { triggeredCount: matchingAlerts.length };
  }

  async sendTarget({
    alertId,
    alert,
    run,
    target,
    options,
    defaultText,
    baseMessageText,
    photoUrl,
    replyMarkup,
    groupsByChatId,
  }: {
    alertId: string;
    alert: AlertWithRelations;
    run: TelegramAlertRuns;
    target: DeliveryTarget;
    options: AlertOptionsInput;
    defaultText: string;
    baseMessageText: string;
    photoUrl?: string;
    replyMarkup?: Record<string, unknown> | undefined;
    groupsByChatId: Map<string, string>;
  }) {
    try {
      let deliveryError: string | null = null;
      let delivered = false;

      if (target.kind === 'chat') {
        const blockReason = getAlertGroupDeliveryBlockReason(
          groupsByChatId.get(target.chatId) ?? alert.group?.botStatus,
        );

        if (blockReason) {
          deliveryError = blockReason;

          this.logger.warn(
            `[alert-dispatch] delivery blocked alertId=${alertId} chatId=${target.chatId} reason=${blockReason}`,
          );
        } else {
          const result = await this.telegram.sendAlertToChat({
            chatId: target.chatId,
            messageThreadId: target.threadId,
            text: defaultText,
            photoUrl,
            silent: options.silent,
            pinMessage: options.pinMessage,
            replyMarkup,
          });

          delivered = result.ok;

          if (!result.ok) {
            deliveryError = result.reason;

            this.logger.warn(
              `[alert-dispatch] chat delivery failed alertId=${alertId} chatId=${target.chatId} reason=${result.reason}`,
            );
          } else {
            this.logger.log(
              `[alert-dispatch] chat delivery ok alertId=${alertId} chatId=${target.chatId}`,
            );
          }
        }
      } else {
        const messageText =
          target.displayName !== undefined
            ? this.renderAutomationMessageText(baseMessageText, {
                scopeToMemberDisplayName: target.displayName,
              })
            : defaultText;

        const result = await this.telegram.sendAlertDm({
          telegramUserId: target.telegramUserId,
          text: messageText,
          photoUrl,
          silent: options.silent,
          replyMarkup,
        });

        delivered = result.ok;

        if (!result.ok) {
          deliveryError = result.reason;

          this.logger.warn(
            `[alert-dispatch] dm delivery failed alertId=${alertId} telegramUserId=${target.telegramUserId} reason=${result.reason}`,
          );
        } else {
          this.logger.log(
            `[alert-dispatch] dm delivery ok alertId=${alertId} telegramUserId=${target.telegramUserId}`,
          );
        }
      }

      await this.prisma.telegramAlertDeliveries.create({
        data: {
          runId: run.id,
          status: delivered
            ? AlertDeliveryStatus.SENT
            : AlertDeliveryStatus.FAILED,
          error: delivered ? undefined : (deliveryError ?? undefined),
          sentAt: delivered ? new Date() : undefined,
          ...(target.kind === 'chat'
            ? {
                chatId: target.chatId,
                threadId: target.threadId ?? undefined,
              }
            : {
                telegramUserId: target.telegramUserId,
              }),
        },
      });

      return {
        delivered,
        error: deliveryError,
      };
    } catch (error) {
      this.logger.error(error);

      return {
        delivered: false,
        error: error instanceof Error ? error.message : 'Erro interno',
      };
    }
  }

  async runAlert(alertId: string, runOptions?: RunAlertOptions) {
    const alert = await this.prisma.telegramAlerts.findUnique({
      where: { id: alertId },
      include: {
        group: { select: { telegramChatId: true, botStatus: true } },
        targets: { select: { telegramUserId: true } },
      },
    });

    if (!alert) {
      throw new NotFoundException('Alert not found.');
    }

    const targets = await this.resolveDeliveryTargets(alert, runOptions);

    this.logger.log(
      `[alert-dispatch] runAlert alertId=${alertId} destinationType=${alert.destinationType} triggerType=${alert.triggerType ?? 'none'} targets=${targets.length} scopeToTelegramUserId=${runOptions?.scopeToTelegramUserId ?? 'none'}`,
    );
    if (targets.length === 0) {
      this.logger.warn(
        `[alert-dispatch] runAlert alertId=${alertId} has 0 delivery targets — no Telegram message will be sent`,
      );
    } else {
      this.logger.log(
        `[alert-dispatch] runAlert targets detail: ${JSON.stringify(targets)}`,
      );
    }

    const run = await this.prisma.telegramAlertRuns.create({
      data: {
        alertId: alert.id,
        status: AlertRunStatus.RUNNING,
        estimatedCount: targets.length,
        startedAt: new Date(),
      },
    });

    let successCount = 0;
    let failCount = 0;
    let firstFailureMessage: string | null = null;
    const options = alert.options as AlertOptionsInput;
    const content = alert.content as AlertContentInput;
    const replyMarkup = this.buildReplyMarkup(content.inlineButtons);
    const baseMessageText = this.buildMessageText(content);
    const photoUrl = content.imageUrl?.trim() || undefined;
    const defaultText = this.renderAutomationMessageText(
      baseMessageText,
      runOptions,
    );

    const chatTargets = targets.filter(
      (target): target is Extract<DeliveryTarget, { kind: 'chat' }> =>
        target.kind === 'chat',
    );
    const groupsByChatId = new Map(
      (
        await this.prisma.telegramGroups.findMany({
          where: {
            telegramChatId: {
              in: [...new Set(chatTargets.map((target) => target.chatId))],
            },
          },
          select: { telegramChatId: true, botStatus: true },
        })
      ).map((group) => [group.telegramChatId, group.botStatus] as const),
    );

    const limit = pLimit(10);

    const results = await Promise.all(
      targets.map((target) =>
        limit(() =>
          this.sendTarget({
            alertId,
            alert,
            run,
            target,
            options,
            defaultText,
            baseMessageText,
            photoUrl,
            replyMarkup,
            groupsByChatId,
          }),
        ),
      ),
    );

    successCount = results.filter((r) => r.delivered).length;
    failCount = results.length - successCount;

    firstFailureMessage = results.find((r) => !r.delivered)?.error ?? null;

    const status = this.resolveRunStatus(successCount, failCount);
    const deliveryRate =
      successCount + failCount === 0
        ? 0
        : Math.round((successCount / (successCount + failCount)) * 100);

    this.logger.log(
      `[alert-dispatch] runAlert finished alertId=${alertId} runId=${run.id} status=${status} success=${successCount} fail=${failCount} estimated=${targets.length}`,
    );

    await this.prisma.$transaction([
      this.prisma.telegramAlertRuns.update({
        where: { id: run.id },
        data: {
          status,
          successCount,
          failCount,
          finishedAt: new Date(),
        },
      }),
      this.prisma.telegramAlerts.update({
        where: { id: alert.id },
        data: {
          status:
            failCount > 0 &&
            successCount === 0 &&
            options.autoPauseOnFailure !== false
              ? AlertStatus.FAILED
              : alert.status,
          deliveryRate,
          lastRunAt: new Date(),
        },
      }),
    ]);

    const shouldThrowOnFailure = runOptions?.throwOnTotalFailure ?? true;
    if (shouldThrowOnFailure && successCount === 0) {
      throw new BadRequestException(
        targets.length === 0
          ? ALERT_DELIVERY_NO_TARGETS_MESSAGE
          : (firstFailureMessage ??
              'Não foi possível enviar o alerta para nenhum destinatário.'),
      );
    }

    return {
      runId: run.id,
      status,
      successCount,
      failCount,
    };
  }

  async dispatchQuickAlert(
    userId: string,
    alertId: string,
    input: AlertQuickDispatchInput,
  ) {
    const alert = await this.prisma.telegramAlerts.findFirst({
      where: {
        id: alertId,
        userId,
        destinationType: AlertDestinationType.QUICK_ALERT,
      },
      select: { id: true, status: true },
    });

    if (!alert) {
      throw new NotFoundException('Alert not found.');
    }

    if (alert.status === AlertStatus.DRAFT) {
      throw new BadRequestException(
        'Ative o aviso rápido antes de enviá-lo nas tabelas.',
      );
    }

    if (input.targetType === 'group') {
      const group = await this.prisma.telegramGroups.findFirst({
        where: { id: input.telegramGroupId, userId },
        select: { telegramChatId: true },
      });

      if (!group) {
        throw new BadRequestException('Telegram group not found.');
      }

      return this.runAlert(alertId, {
        scopeToTelegramChatId: group.telegramChatId,
        scopeToMessageThreadId: input.messageThreadId,
      });
    }

    const membersMap = new Map<
      string,
      {
        telegramUserId: string;
        displayName?: string;
      }
    >();

    for (const target of input.targets) {
      if ('telegramUserId' in target) {
        membersMap.set(target.telegramUserId, {
          telegramUserId: target.telegramUserId,
          displayName: target.displayName,
        });

        continue;
      }

      const groupIds = input.targets
        .filter(
          (target): target is { groupId: string; selectAllInGroup: true } =>
            'groupId' in target,
        )
        .map((target) => target.groupId);

      const members = await this.prisma.telegramGroupMembers.findMany({
        where: {
          telegramGroupId: {
            in: groupIds,
          },
        },
        select: {
          telegramUserId: true,
          firstName: true,
          lastName: true,
        },
      });

      for (const member of members) {
        membersMap.set(member.telegramUserId, {
          telegramUserId: member.telegramUserId,
          displayName:
            [member.firstName, member.lastName]
              .filter((name): name is string => Boolean(name))
              .join(' ') || undefined,
        });
      }
    }

    const uniqueMembers = [...membersMap.values()];

    return this.runAlert(alertId, {
      quickDispatchMembers: uniqueMembers,
    });
  }

  private async triggerAlertsForEvent(input: AlertInternalTriggerInput) {
    const groupsForChat = await this.prisma.telegramGroups.findMany({
      where: { telegramChatId: input.chatId },
      select: { id: true },
    });
    const groupIdsForChat = new Set(groupsForChat.map((group) => group.id));

    const automationAlerts = await this.prisma.telegramAlerts.findMany({
      where: {
        status: AlertStatus.ACTIVE,
        destinationType: AlertDestinationType.AUTOMATION,
        triggerType: input.triggerType,
      },
      select: {
        id: true,
        telegramGroupId: true,
        triggerConfig: true,
      },
      take: 100,
    });

    const alertIds = new Set<string>();
    for (const alert of automationAlerts) {
      const groupIds = this.getStoredGroupIds(alert);
      if (groupIds.some((groupId) => groupIdsForChat.has(groupId))) {
        alertIds.add(alert.id);
      }
    }

    for (const alertId of alertIds) {
      await this.runAlert(alertId, {
        scopeToTelegramChatId: input.chatId,
        scopeToMessageThreadId: input.messageThreadId,
        scopeToTelegramUserId: input.telegramUserId,
        scopeToMemberDisplayName: input.telegramUserDisplayName,
        throwOnTotalFailure: false,
      });
    }

    return { triggeredCount: alertIds.size };
  }

  private async resolveDeliveryTargets(
    alert: {
      destinationType: AlertDestinationType;
      telegramGroupId: string | null;
      messageThreadId: number | null;
      triggerType?: string | null;
      triggerConfig?: unknown;
      group: { telegramChatId: string; botStatus: string } | null;
      targets: { telegramUserId: string }[];
    },
    options?: RunAlertOptions,
  ): Promise<DeliveryTarget[]> {
    if (
      alert.destinationType === AlertDestinationType.GROUP ||
      alert.destinationType === AlertDestinationType.AUTOMATION
    ) {
      if (
        alert.destinationType === AlertDestinationType.AUTOMATION &&
        options?.scopeToTelegramUserId &&
        isStripeAutomationTriggerType(alert.triggerType)
      ) {
        return [
          {
            kind: 'member',
            telegramUserId: options.scopeToTelegramUserId,
            displayName: options.scopeToMemberDisplayName,
          },
        ];
      }

      if (
        alert.destinationType === AlertDestinationType.AUTOMATION &&
        isStripeAutomationTriggerType(alert.triggerType)
      ) {
        this.logger.warn(
          `[alert-dispatch] resolveDeliveryTargets: Stripe automation without subscriber scope → 0 targets triggerType=${alert.triggerType} scopeToTelegramUserId=${options?.scopeToTelegramUserId ?? 'none'}`,
        );
        return [];
      }

      if (
        alert.destinationType === AlertDestinationType.AUTOMATION &&
        options?.scopeToTelegramChatId
      ) {
        const deliverToPrivate =
          alert.triggerType === 'MEMBER_LEFT_PRIVATE_MESSAGE';
        const targets: DeliveryTarget[] = [];

        if (!deliverToPrivate) {
          targets.push({
            kind: 'chat',
            chatId: options.scopeToTelegramChatId,
            threadId:
              options.scopeToMessageThreadId ??
              alert.messageThreadId ??
              undefined,
          });
        }

        if (deliverToPrivate && options.scopeToTelegramUserId) {
          targets.push({
            kind: 'member',
            telegramUserId: options.scopeToTelegramUserId,
          });
        }

        return targets;
      }

      const groupIds = this.getStoredGroupIds(alert);
      if (groupIds.length === 0) {
        if (!alert.group) return [];
        return [
          {
            kind: 'chat',
            chatId: alert.group.telegramChatId,
            threadId: alert.messageThreadId,
          },
        ];
      }

      const groups = await this.prisma.telegramGroups.findMany({
        where: { id: { in: groupIds } },
        select: { telegramChatId: true },
      });

      return groups.map((group) => ({
        kind: 'chat' as const,
        chatId: group.telegramChatId,
        threadId: alert.messageThreadId ?? undefined,
      }));
    }

    if (alert.destinationType === AlertDestinationType.TOPIC) {
      const threadIds = this.getStoredTopicIds(alert);
      if (!alert.group || threadIds.length === 0) return [];
      return threadIds.map((threadId) => ({
        kind: 'chat' as const,
        chatId: alert.group!.telegramChatId,
        threadId,
      }));
    }

    if (alert.destinationType === AlertDestinationType.MEMBERS) {
      return alert.targets.map((target) => ({
        kind: 'member',
        telegramUserId: target.telegramUserId,
      }));
    }

    if (alert.destinationType === AlertDestinationType.QUICK_ALERT) {
      if (options?.quickDispatchMembers?.length) {
        return options.quickDispatchMembers.map((member) => ({
          kind: 'member' as const,
          telegramUserId: member.telegramUserId,
          displayName: member.displayName,
        }));
      }

      if (options?.scopeToTelegramChatId) {
        return [
          {
            kind: 'chat' as const,
            chatId: options.scopeToTelegramChatId,
            threadId: options.scopeToMessageThreadId,
          },
        ];
      }

      return [];
    }

    return [];
  }

  private buildMessageText(content: AlertContentInput) {
    return content.title ? `${content.title}\n\n${content.body}` : content.body;
  }

  private renderAutomationMessageText(
    text: string,
    runOptions?: RunAlertOptions,
  ) {
    const memberName = runOptions?.scopeToMemberDisplayName?.trim() || 'Membro';
    return text.replace(/\{name\}/g, memberName);
  }

  private buildReplyMarkup(buttons?: { text: string; url: string }[]) {
    if (!buttons?.length) return undefined;

    return {
      inline_keyboard: buttons.map((button) => [
        { text: button.text, url: button.url },
      ]),
    };
  }

  private resolveWaitMs(rateLimitPerMinute = DEFAULT_RATE_LIMIT_PER_MINUTE) {
    if (rateLimitPerMinute <= 0) return 0;
    return Math.ceil(60_000 / Math.min(rateLimitPerMinute, 60));
  }

  private resolveRunStatus(successCount: number, failCount: number) {
    if (failCount === 0) return AlertRunStatus.COMPLETED;
    if (successCount === 0) return AlertRunStatus.FAILED;
    return AlertRunStatus.PARTIAL;
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private resolveAlertTriggerFeature(
    triggerType: AlertTriggerType,
  ): PlanFeatureId {
    if (triggerType.startsWith('STRIPE_')) {
      return 'stripeAlerts';
    }
    if (triggerType === 'FORUM_TOPIC_CREATED') {
      return 'forumTopicAlerts';
    }
    return 'advancedTelegramAlerts';
  }

  private async assertAlertTriggerAllowed(
    userId: string,
    triggerType: AlertTriggerType | null | undefined,
  ) {
    if (!triggerType) {
      return;
    }

    const planId = await this.groupLimit.resolvePlanId(userId);
    if (isAlertTriggerAllowedForPlan(planId, triggerType)) {
      return;
    }

    const feature = this.resolveAlertTriggerFeature(triggerType);
    throw new ForbiddenException({
      error: PLAN_FEATURE_REQUIRED_CODE,
      feature,
      planId,
      requiredPlanId: getMinPlanForFeature(feature),
      message: buildPlanFeatureRequiredMessage(feature, planId),
    });
  }

  private async assertAlertAccess(userId: string, alertId: string) {
    const alert = await this.prisma.telegramAlerts.findFirst({
      where: { id: alertId, userId },
      select: { id: true },
    });

    if (!alert) {
      throw new NotFoundException('Alert not found.');
    }
  }

  private getAlertGroupIds(input: AlertUpsertInput): string[] {
    const fromConfig = (
      input.triggerConfig?.targetTelegramGroupIds ?? []
    ).filter(Boolean);
    if (fromConfig.length > 0) return fromConfig;
    return input.telegramGroupId ? [input.telegramGroupId] : [];
  }

  private getStoredGroupIds(alert: {
    telegramGroupId?: string | null;
    triggerConfig?: unknown;
  }): string[] {
    const config = (alert.triggerConfig ?? {}) as {
      targetTelegramGroupIds?: string[];
    };
    const fromConfig = (config.targetTelegramGroupIds ?? []).filter(Boolean);
    if (fromConfig.length > 0) return fromConfig;
    return alert.telegramGroupId ? [alert.telegramGroupId] : [];
  }

  private getStoredTopicIds(alert: {
    messageThreadId?: number | null;
    triggerConfig?: unknown;
  }): number[] {
    const config = (alert.triggerConfig ?? {}) as {
      targetMessageThreadIds?: number[];
    };
    const fromConfig = (config.targetMessageThreadIds ?? []).filter(
      (threadId) => Number.isFinite(threadId) && threadId > 0,
    );
    if (fromConfig.length > 0) return fromConfig;
    return alert.messageThreadId ? [alert.messageThreadId] : [];
  }

  private async assertGroupsAccess(userId: string, groupIds: string[]) {
    if (groupIds.length === 0) return;

    const count = await this.prisma.telegramGroups.count({
      where: { id: { in: groupIds }, userId },
    });

    if (count !== groupIds.length) {
      throw new BadRequestException('Telegram group not found.');
    }
  }

  private async assertGroupAccess(userId: string, telegramGroupId?: string) {
    if (!telegramGroupId) return;

    const group = await this.prisma.telegramGroups.findFirst({
      where: { id: telegramGroupId, userId },
      select: { id: true },
    });

    if (!group) {
      throw new BadRequestException('Telegram group not found.');
    }
  }

  private getStoredRecipientCount(alert: {
    destinationType: AlertDestinationType;
    telegramGroupId?: string | null;
    messageThreadId?: number | null;
    triggerConfig?: unknown;
    targets?: { telegramUserId: string }[];
  }) {
    if (alert.destinationType === AlertDestinationType.MEMBERS) {
      return alert.targets?.length ?? 0;
    }

    if (alert.destinationType === AlertDestinationType.QUICK_ALERT) {
      return null;
    }

    if (
      alert.destinationType === AlertDestinationType.GROUP ||
      alert.destinationType === AlertDestinationType.AUTOMATION
    ) {
      const count = this.getStoredGroupIds(alert).length;
      return count > 0 ? count : 1;
    }

    return alert.destinationType === AlertDestinationType.TOPIC
      ? this.getStoredTopicIds(alert).length || null
      : null;
  }

  private normalizeOptions(options: AlertOptionsInput) {
    return {
      silent: options.silent ?? false,
      pinMessage: options.pinMessage ?? false,
      mentionUsers: options.mentionUsers ?? false,
      respectLocalTime: options.respectLocalTime ?? true,
      autoPauseOnFailure: options.autoPauseOnFailure ?? true,
      rateLimitPerMinute:
        options.rateLimitPerMinute ?? DEFAULT_RATE_LIMIT_PER_MINUTE,
    };
  }

  private normalizeStripeAutomationInput(
    input: AlertUpsertInput,
  ): AlertUpsertInput {
    const keepStripeConnection =
      input.destinationType === AlertDestinationType.AUTOMATION &&
      isStripeAutomationTriggerType(input.triggerType);

    if (keepStripeConnection) return input;

    const config = (input.triggerConfig ?? {}) as {
      stripeConnectionId?: string;
    };
    if (!config.stripeConnectionId) return input;

    return {
      ...input,
      triggerConfig: {
        ...config,
        stripeConnectionId: undefined,
      },
    };
  }

  private async assertStripeConnectionForTrigger(
    userId: string,
    triggerType: AlertUpsertInput['triggerType'],
    triggerConfig: AlertUpsertInput['triggerConfig'],
  ) {
    if (!isStripeAutomationTriggerType(triggerType)) return;

    const connectionId = triggerConfig?.stripeConnectionId;
    if (!connectionId) {
      throw new BadRequestException(
        'Selecione o plano Stripe monitorado para este alerta.',
      );
    }

    const connection = await this.prisma.stripeBillingConnections.findFirst({
      where: {
        id: connectionId,
        userId,
        status: StripeBillingConnectionStatus.CONNECTED,
      },
      select: { id: true },
    });

    if (!connection) {
      throw new BadRequestException(
        'O plano Stripe selecionado é inválido ou está desconectado.',
      );
    }
  }

  private normalizeQuickAlertInput(input: AlertUpsertInput): AlertUpsertInput {
    if (input.destinationType !== AlertDestinationType.QUICK_ALERT) {
      return input;
    }

    return {
      ...input,
      telegramGroupId: undefined,
      messageThreadId: undefined,
      targetTelegramUserIds: [],
      triggerConfig: {
        ...(input.triggerConfig ?? {}),
        tableSelectionSource: undefined,
        targetTelegramGroupIds: [],
        targetMessageThreadIds: [],
      },
    };
  }

  private normalizeTopicSelection(input: AlertUpsertInput): AlertUpsertInput {
    const config = (input.triggerConfig ?? {}) as {
      targetTelegramGroupIds?: string[];
      targetMessageThreadIds?: number[];
    };
    const groupIds = (config.targetTelegramGroupIds ?? []).filter(Boolean);
    const fallbackGroupIds =
      groupIds.length > 0
        ? groupIds
        : input.telegramGroupId
          ? [input.telegramGroupId]
          : [];
    const topicIds = (config.targetMessageThreadIds ?? []).filter(
      (threadId) => Number.isFinite(threadId) && threadId > 0,
    );
    const fallbackTopicIds =
      topicIds.length > 0
        ? topicIds
        : input.messageThreadId
          ? [input.messageThreadId]
          : [];

    if (input.destinationType === AlertDestinationType.MEMBERS) {
      return {
        ...input,
        telegramGroupId: undefined,
        messageThreadId: undefined,
        triggerType: undefined,
        triggerConfig: {
          ...(input.triggerConfig ?? {}),
          tableSelectionSource: undefined,
          targetTelegramGroupIds: [],
          targetMessageThreadIds: [],
        },
      };
    }

    if (input.destinationType === AlertDestinationType.GROUP) {
      return {
        ...input,
        telegramGroupId: fallbackGroupIds[0],
        messageThreadId: undefined,
        targetTelegramUserIds: [],
        triggerType: undefined,
        triggerConfig: {
          ...(input.triggerConfig ?? {}),
          tableSelectionSource: undefined,
          targetTelegramGroupIds: fallbackGroupIds,
          targetMessageThreadIds: [],
        },
      };
    }

    if (input.destinationType === AlertDestinationType.AUTOMATION) {
      return {
        ...input,
        telegramGroupId: fallbackGroupIds[0],
        messageThreadId: undefined,
        targetTelegramUserIds: [],
        triggerConfig: {
          ...(input.triggerConfig ?? {}),
          tableSelectionSource: undefined,
          targetTelegramGroupIds: fallbackGroupIds,
          targetMessageThreadIds: [],
        },
      };
    }

    if (input.destinationType !== AlertDestinationType.TOPIC) {
      return input;
    }

    return {
      ...input,
      telegramGroupId: fallbackGroupIds[0],
      messageThreadId: fallbackTopicIds[0],
      targetTelegramUserIds: [],
      triggerType: undefined,
      triggerConfig: {
        ...(input.triggerConfig ?? {}),
        tableSelectionSource: undefined,
        targetTelegramGroupIds: fallbackGroupIds[0]
          ? [fallbackGroupIds[0]]
          : [],
        targetMessageThreadIds: fallbackTopicIds,
      },
    };
  }

  private resolveInitialStatus(input: AlertUpsertInput) {
    return input.status ?? AlertStatus.DRAFT;
  }
}
